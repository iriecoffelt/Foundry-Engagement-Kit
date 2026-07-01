//! Calendar integration for reading system calendar events
//!
//! This module provides cross-platform calendar access.
//!
//! ## macOS Native Calendar (EventKit)
//!
//! On macOS, this module can optionally use Apple's EventKit framework to read
//! calendar events directly from the system calendar. This requires:
//!
//! 1. Rust 1.85+ (for objc2 crate dependencies)
//! 2. The following dependencies in Cargo.toml:
//!    ```toml
//!    [target.'cfg(target_os = "macos")'.dependencies]
//!    objc2 = "0.6"
//!    objc2-foundation = { version = "0.3", features = ["NSDate", "NSArray", "NSString", "NSCalendar", "NSError", "NSEnumerator", "NSURL"] }
//!    objc2-event-kit = { version = "0.3", features = ["EKEventStore", "EKCalendar", "EKEvent", "EKObject", "EKSource", "EKTypes", "EKParticipant", "block2"] }
//!    block2 = "0.6"
//!    ```
//! 3. App signing with calendar entitlements
//! 4. NSCalendarsFullAccessUsageDescription in Info.plist (already configured in tauri.conf.json)
//!
//! When building with Rust < 1.85 or without the EventKit dependencies, the
//! calendar functions will return "unsupported_platform" status.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub is_all_day: bool,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub calendar_name: String,
    pub calendar_color: Option<String>,
    pub meeting_url: Option<String>,
    pub organizer: Option<String>,
    pub attendees: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarInfo {
    pub id: String,
    pub title: String,
    pub color: Option<String>,
    pub source_name: String,
    pub is_subscribed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarAccessStatus {
    pub has_access: bool,
    pub status: String,
    pub can_request: bool,
}

// ============================================================================
// macOS EventKit Implementation
// ============================================================================
// This implementation requires Rust 1.85+ and the objc2-event-kit crate.
// Enable by uncommenting the dependencies in Cargo.toml when your Rust version
// supports it.

#[cfg(all(target_os = "macos", feature = "eventkit"))]
mod macos {
    use super::*;
    use block2::RcBlock;
    use chrono::{Local, NaiveDate, TimeZone};
    use objc2::rc::Retained;
    use objc2::runtime::Bool;
    use objc2_event_kit::{
        EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore, EKParticipant,
    };
    use objc2_foundation::{NSArray, NSDate, NSString};
    use std::sync::mpsc;

    fn nsdate_to_iso(date: &NSDate) -> String {
        let interval = unsafe { date.timeIntervalSince1970() };
        let secs = interval as i64;
        let nsecs = ((interval - secs as f64) * 1_000_000_000.0) as u32;
        if let Some(dt) = chrono::DateTime::from_timestamp(secs, nsecs) {
            dt.with_timezone(&Local).to_rfc3339()
        } else {
            String::new()
        }
    }

    fn nsstring_to_string(ns: Option<&NSString>) -> Option<String> {
        ns.map(|s| s.to_string())
    }

    fn calendar_color_hex(_calendar: &EKCalendar) -> Option<String> {
        None
    }

    fn extract_meeting_url(event: &EKEvent) -> Option<String> {
        unsafe {
            if let Some(url) = event.URL() {
                let url_str = url.absoluteString();
                if let Some(s) = url_str {
                    let s = s.to_string();
                    if s.contains("zoom.us")
                        || s.contains("meet.google.com")
                        || s.contains("teams.microsoft.com")
                        || s.contains("webex.com")
                    {
                        return Some(s);
                    }
                }
            }

            if let Some(notes) = event.notes() {
                let notes_str = notes.to_string();
                for line in notes_str.lines() {
                    let trimmed = line.trim();
                    if (trimmed.contains("zoom.us")
                        || trimmed.contains("meet.google.com")
                        || trimmed.contains("teams.microsoft.com")
                        || trimmed.contains("webex.com"))
                        && (trimmed.starts_with("http://") || trimmed.starts_with("https://"))
                    {
                        if let Some(url) = trimmed.split_whitespace().next() {
                            return Some(url.to_string());
                        }
                    }
                }
            }

            if let Some(location) = event.location() {
                let loc_str = location.to_string();
                if (loc_str.contains("zoom.us")
                    || loc_str.contains("meet.google.com")
                    || loc_str.contains("teams.microsoft.com")
                    || loc_str.contains("webex.com"))
                    && (loc_str.starts_with("http://") || loc_str.starts_with("https://"))
                {
                    return Some(loc_str);
                }
            }

            None
        }
    }

    fn extract_attendees(event: &EKEvent) -> Vec<String> {
        unsafe {
            let mut attendees = Vec::new();
            if let Some(participants) = event.attendees() {
                for i in 0..participants.count() {
                    if let Some(participant) = participants.objectAtIndex(i) {
                        let participant: &EKParticipant =
                            &*(participant as *const _ as *const EKParticipant);
                        if let Some(name) = participant.name() {
                            attendees.push(name.to_string());
                        }
                    }
                }
            }
            attendees
        }
    }

    fn extract_organizer(event: &EKEvent) -> Option<String> {
        unsafe { event.organizer().and_then(|o| o.name().map(|n| n.to_string())) }
    }

    pub fn get_authorization_status() -> CalendarAccessStatus {
        let status = EKEventStore::authorizationStatusForEntityType(EKEntityType::Event);
        match status {
            EKAuthorizationStatus::Authorized | EKAuthorizationStatus::FullAccess => {
                CalendarAccessStatus {
                    has_access: true,
                    status: "authorized".to_string(),
                    can_request: false,
                }
            }
            EKAuthorizationStatus::WriteOnly => CalendarAccessStatus {
                has_access: false,
                status: "write_only".to_string(),
                can_request: true,
            },
            EKAuthorizationStatus::Denied => CalendarAccessStatus {
                has_access: false,
                status: "denied".to_string(),
                can_request: false,
            },
            EKAuthorizationStatus::Restricted => CalendarAccessStatus {
                has_access: false,
                status: "restricted".to_string(),
                can_request: false,
            },
            EKAuthorizationStatus::NotDetermined => CalendarAccessStatus {
                has_access: false,
                status: "not_determined".to_string(),
                can_request: true,
            },
            _ => CalendarAccessStatus {
                has_access: false,
                status: "unknown".to_string(),
                can_request: true,
            },
        }
    }

    pub fn request_calendar_access() -> Result<bool, String> {
        let store = unsafe { EKEventStore::new() };
        let (tx, rx) = mpsc::channel();

        let callback = RcBlock::new(move |granted: Bool, _error: *mut objc2_foundation::NSError| {
            let _ = tx.send(granted.as_bool());
        });

        unsafe {
            store.requestFullAccessToEventsWithCompletion(&callback);
        }

        rx.recv()
            .map_err(|_| "Failed to receive authorization response".to_string())
    }

    pub fn list_calendars() -> Result<Vec<CalendarInfo>, String> {
        let status = get_authorization_status();
        if !status.has_access {
            return Err(format!(
                "Calendar access not granted. Status: {}",
                status.status
            ));
        }

        let store = unsafe { EKEventStore::new() };
        let calendars =
            unsafe { store.calendarsForEntityType(EKEntityType::Event) };

        let mut result = Vec::new();
        for i in 0..calendars.len() {
            if let Some(cal) = calendars.get(i) {
                let source_name = unsafe {
                    cal.source()
                        .and_then(|s| s.title().map(|t| t.to_string()))
                        .unwrap_or_default()
                };

                let is_subscribed = unsafe { cal.isSubscribed() };

                result.push(CalendarInfo {
                    id: unsafe { cal.calendarIdentifier().to_string() },
                    title: unsafe { cal.title().to_string() },
                    color: calendar_color_hex(cal),
                    source_name,
                    is_subscribed,
                });
            }
        }

        Ok(result)
    }

    pub fn get_events_for_date(date_str: &str) -> Result<Vec<CalendarEvent>, String> {
        let status = get_authorization_status();
        if !status.has_access {
            return Err(format!(
                "Calendar access not granted. Status: {}",
                status.status
            ));
        }

        let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
            .map_err(|e| format!("Invalid date format: {e}"))?;

        let start_of_day = Local
            .from_local_datetime(&date.and_hms_opt(0, 0, 0).unwrap())
            .single()
            .ok_or("Invalid local time")?;
        let end_of_day = Local
            .from_local_datetime(&date.and_hms_opt(23, 59, 59).unwrap())
            .single()
            .ok_or("Invalid local time")?;

        let start_interval = start_of_day.timestamp() as f64;
        let end_interval = end_of_day.timestamp() as f64;

        let store = unsafe { EKEventStore::new() };

        let start_date =
            unsafe { NSDate::dateWithTimeIntervalSince1970(start_interval) };
        let end_date =
            unsafe { NSDate::dateWithTimeIntervalSince1970(end_interval) };

        let calendars = unsafe { store.calendarsForEntityType(EKEntityType::Event) };
        let calendars_ptr: Option<&NSArray<EKCalendar>> = Some(&calendars);

        let predicate = unsafe {
            store.predicateForEventsWithStartDate_endDate_calendars(
                &start_date,
                &end_date,
                calendars_ptr,
            )
        };

        let events = unsafe { store.eventsMatchingPredicate(&predicate) };

        let mut result = Vec::new();
        for i in 0..events.len() {
            if let Some(event) = events.get(i) {
                let calendar_name = unsafe {
                    event
                        .calendar()
                        .map(|c| c.title().to_string())
                        .unwrap_or_default()
                };

                let calendar_color = unsafe { event.calendar().and_then(|c| calendar_color_hex(&c)) };

                let start_time = unsafe {
                    event
                        .startDate()
                        .map(|d| nsdate_to_iso(&d))
                        .unwrap_or_default()
                };

                let end_time = unsafe {
                    event
                        .endDate()
                        .map(|d| nsdate_to_iso(&d))
                        .unwrap_or_default()
                };

                result.push(CalendarEvent {
                    id: unsafe { event.eventIdentifier().map(|s| s.to_string()).unwrap_or_default() },
                    title: unsafe { event.title().map(|s| s.to_string()).unwrap_or_else(|| "(No title)".to_string()) },
                    start_time,
                    end_time,
                    is_all_day: unsafe { event.isAllDay() },
                    location: unsafe { nsstring_to_string(event.location().as_deref()) },
                    notes: unsafe { nsstring_to_string(event.notes().as_deref()) },
                    calendar_name,
                    calendar_color,
                    meeting_url: extract_meeting_url(event),
                    organizer: extract_organizer(event),
                    attendees: extract_attendees(event),
                });
            }
        }

        result.sort_by(|a, b| a.start_time.cmp(&b.start_time));
        Ok(result)
    }

    pub fn get_todays_events() -> Result<Vec<CalendarEvent>, String> {
        let today = Local::now().format("%Y-%m-%d").to_string();
        get_events_for_date(&today)
    }
}

// ============================================================================
// Fallback Implementation
// ============================================================================
// Used when EventKit is not available (non-macOS platforms, or macOS without
// the EventKit feature enabled).

#[cfg(not(all(target_os = "macos", feature = "eventkit")))]
mod fallback {
    use super::*;

    pub fn get_authorization_status() -> CalendarAccessStatus {
        CalendarAccessStatus {
            has_access: false,
            status: "unsupported_platform".to_string(),
            can_request: false,
        }
    }

    pub fn request_calendar_access() -> Result<bool, String> {
        Err("Calendar access is only supported on macOS with EventKit enabled. \
             Please upgrade to Rust 1.85+ and enable the EventKit dependencies in Cargo.toml."
            .to_string())
    }

    pub fn list_calendars() -> Result<Vec<CalendarInfo>, String> {
        Err("Calendar access is only supported on macOS with EventKit enabled. \
             Please upgrade to Rust 1.85+ and enable the EventKit dependencies in Cargo.toml."
            .to_string())
    }

    pub fn get_events_for_date(_date_str: &str) -> Result<Vec<CalendarEvent>, String> {
        Err("Calendar access is only supported on macOS with EventKit enabled. \
             Please upgrade to Rust 1.85+ and enable the EventKit dependencies in Cargo.toml."
            .to_string())
    }

    pub fn get_todays_events() -> Result<Vec<CalendarEvent>, String> {
        Err("Calendar access is only supported on macOS with EventKit enabled. \
             Please upgrade to Rust 1.85+ and enable the EventKit dependencies in Cargo.toml."
            .to_string())
    }
}

// ============================================================================
// Module Re-exports
// ============================================================================

#[cfg(all(target_os = "macos", feature = "eventkit"))]
use macos::*;

#[cfg(not(all(target_os = "macos", feature = "eventkit")))]
use fallback::*;

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn calendar_get_access_status() -> CalendarAccessStatus {
    get_authorization_status()
}

#[tauri::command]
pub async fn calendar_request_access() -> Result<bool, String> {
    request_calendar_access()
}

#[tauri::command]
pub fn calendar_list_calendars() -> Result<Vec<CalendarInfo>, String> {
    list_calendars()
}

#[tauri::command]
pub fn calendar_get_events_for_date(date: String) -> Result<Vec<CalendarEvent>, String> {
    get_events_for_date(&date)
}

#[tauri::command]
pub fn calendar_get_todays_events() -> Result<Vec<CalendarEvent>, String> {
    get_todays_events()
}
