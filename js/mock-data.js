/* ==========================================================================
   Centralized Mock Data — College Bus Management System
   ========================================================================== */

const DB = {
  currentUser: {
    role: "admin",
    name: "Admin User",
    email: "admin@college.edu",
    id: "ADM-001",
  },

  routes: [
    { id: "RT-A", name: "Route A — Bhimtal", stops: ["Bhimtal Market", "Bhimtal Lake", "Nainital Road", "College Gate"], distance: "18.4 km", eta: "42 min", bus: "BUS-007", status: "Active" },
    { id: "RT-B", name: "Route B — Haldwani", stops: ["Haldwani Bus Stand", "Kathgodam", "Rampur Rd", "College Gate"], distance: "24.1 km", eta: "55 min", bus: "BUS-004", status: "Active" },
    { id: "RT-C", name: "Route C — Rudrapur", stops: ["Rudrapur Chowk", "Pantnagar", "Kichha Rd", "College Gate"], distance: "31.6 km", eta: "1 hr 05 min", bus: "BUS-012", status: "Active" },
    { id: "RT-D", name: "Route D — Ramnagar", stops: ["Ramnagar Stand", "Kaladhungi", "Bail Parao", "College Gate"], distance: "27.9 km", eta: "58 min", bus: "BUS-001", status: "Inactive" },
  ],

  buses: [
    { id: "BUS-007", registration: "UK04-AB-1024", route: "Route A", routeId: "RT-A", driver: "Rahul Sharma", conductor: "Amit Kumar", capacity: 45, occupancy: 38, status: "Running", eta: 8, lastStop: "Bhimtal Lake", nextStop: "Nainital Road", lat: 62, lng: 38 },
    { id: "BUS-004", registration: "UK04-AC-4471", route: "Route B", routeId: "RT-B", driver: "Suresh Rawat", conductor: "Deepak Bisht", capacity: 45, occupancy: 41, status: "Delayed", eta: 24, lastStop: "Kathgodam", nextStop: "Rampur Rd", lat: 30, lng: 65 },
    { id: "BUS-012", registration: "UK04-AD-7719", route: "Route C", routeId: "RT-C", driver: "Manoj Joshi", conductor: "Vikas Negi", capacity: 50, occupancy: 47, status: "Running", eta: 15, lastStop: "Pantnagar", nextStop: "Kichha Rd", lat: 75, lng: 55 },
    { id: "BUS-001", registration: "UK04-AA-1187", route: "Route D", routeId: "RT-D", driver: "Anil Pandey", conductor: "Rohit Mehra", capacity: 40, occupancy: 0, status: "Offline", eta: null, lastStop: "Depot", nextStop: "—", lat: 15, lng: 20 },
    { id: "BUS-009", registration: "UK04-AE-3390", route: "Route A", routeId: "RT-A", driver: "Vinod Bora", conductor: "Sanjay Rana", capacity: 45, occupancy: 45, status: "Arrived", eta: 0, lastStop: "College Gate", nextStop: "—", lat: 88, lng: 30 },
  ],

  students: [
    { id: "GEHU2026A101", name: "Mitul Upadhyay", bus: "BUS-007", route: "Route A", stop: "Bhimtal Market", status: "Boarded", boardTime: "07:42 AM", date: "2026-08-16", passValid: "2026–2027" },
    { id: "GEHU2026A102", name: "Priya Negi", bus: "BUS-007", route: "Route A", stop: "Bhimtal Lake", status: "Boarded", boardTime: "07:45 AM", date: "2026-08-16", passValid: "2026–2027" },
    { id: "GEHU2026B203", name: "Kabir Rawat", bus: "BUS-004", route: "Route B", stop: "Kathgodam", status: "Not Boarded", boardTime: "—", date: "2026-08-16", passValid: "2026–2027" },
    { id: "GEHU2026C305", name: "Ananya Joshi", bus: "BUS-012", route: "Route C", stop: "Pantnagar", status: "Boarded", boardTime: "07:38 AM", date: "2026-08-16", passValid: "2026–2027" },
    { id: "GEHU2026A110", name: "Devansh Bisht", bus: "BUS-007", route: "Route A", stop: "Nainital Road", status: "Boarded", boardTime: "07:50 AM", date: "2026-08-16", passValid: "2026–2027" },
    { id: "GEHU2026B210", name: "Ira Pant", bus: "BUS-004", route: "Route B", stop: "Rampur Rd", status: "Not Boarded", boardTime: "—", date: "2026-08-16", passValid: "2026–2027" },
  ],

  drivers: [
    { id: "DRV-01", name: "Rahul Sharma", bus: "BUS-007", phone: "+91 98765 43210", status: "Active", license: "UK-DL-2019-8871" },
    { id: "DRV-02", name: "Suresh Rawat", bus: "BUS-004", phone: "+91 98765 22110", status: "Active", license: "UK-DL-2017-4432" },
    { id: "DRV-03", name: "Manoj Joshi", bus: "BUS-012", phone: "+91 98765 90881", status: "Active", license: "UK-DL-2020-1123" },
    { id: "DRV-04", name: "Anil Pandey", bus: "BUS-001", phone: "+91 98765 55210", status: "Inactive", license: "UK-DL-2015-9987" },
  ],

  conductors: [
    { id: "CND-01", name: "Amit Kumar", bus: "BUS-007", phone: "+91 91234 43210", status: "Active" },
    { id: "CND-02", name: "Deepak Bisht", bus: "BUS-004", phone: "+91 91234 22110", status: "Active" },
    { id: "CND-03", name: "Vikas Negi", bus: "BUS-012", phone: "+91 91234 90881", status: "Active" },
  ],

  leaveRequests: [
    { id: "LR-101", student: "Mitul Upadhyay", type: "Morning", date: "2026-08-18", reason: "Doctor appointment", status: "Pending" },
    { id: "LR-102", student: "Priya Negi", type: "Full Day", date: "2026-08-19", reason: "Family function", status: "Approved" },
    { id: "LR-103", student: "Kabir Rawat", type: "Evening", date: "2026-08-17", reason: "Sports practice", status: "Rejected" },
    { id: "LR-104", student: "Ananya Joshi", type: "No Bus", date: "2026-08-20", reason: "Traveling with family", status: "Pending" },
  ],

  complaints: [
    { id: "CMP-01", student: "Kabir Rawat", bus: "BUS-004", subject: "Bus arrived 20 min late", status: "Pending", date: "2026-08-14" },
    { id: "CMP-02", student: "Ira Pant", bus: "BUS-004", subject: "AC not working", status: "Resolved", date: "2026-08-12" },
  ],

  notifications: [
    { id: 1, icon: "🚌", text: "Bus #07 is delayed by 8 minutes", time: "2 min ago", unread: true },
    { id: 2, icon: "✓", text: "Mitul boarded Bus #07", time: "18 min ago", unread: true },
    { id: 3, icon: "🚨", text: "Emergency reported on Bus #04", time: "1 hr ago", unread: true },
    { id: 4, icon: "📋", text: "Leave request approved", time: "3 hr ago", unread: false },
    { id: 5, icon: "✓", text: "Bus #12 reached college", time: "5 hr ago", unread: false },
  ],

  attendanceTrend: [82, 88, 79, 91, 85, 94, 90],
  attendanceLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"],

  parentChild: {
    name: "Mitul Upadhyay",
    id: "GEHU2026A101",
    bus: "BUS-007",
    route: "Route A",
    driver: "Rahul Sharma",
    driverPhone: "+91 98765 43210",
    journey: [
      { label: "Boarded Bus", done: true, time: "07:42 AM" },
      { label: "Reached College", done: true, time: "08:24 AM" },
      { label: "Return Trip", done: false, time: null },
      { label: "Reached Home", done: false, time: null },
    ],
    events: [
      { time: "08:12 AM", text: "Mitul boarded Bus #07" },
      { time: "08:54 AM", text: "Bus reached college" },
      { time: "04:35 PM", text: "Return trip started" },
    ],
  },
};

// Persist a mutable copy across pages within a session (per-tab)
if (!window.__BUS_DB__) {
  window.__BUS_DB__ = DB;
}
