/* ============================================================
   BusFlow · js/data.js
   Centralised mock data + reactive store.

   Everything the prototype knows about lives here. Every page
   reads from the same store, so an action taken on one screen
   (e.g. the conductor scanning a pass) is reflected everywhere:
   attendance, parent notifications, admin KPIs, occupancy.

   In production this layer is replaced by the C++ (OOP + DSA)
   backend over a thin REST/WebSocket adapter — the shape of the
   data below mirrors the planned server entities.
   ============================================================ */
(function (global) {
  "use strict";

  const STORAGE_KEY = "busflow.state.v3";
  const SESSION_KEY = "busflow.session.v3";

  /* ----------------------------------------------------------
     ROUTES — geometry is authored in the 1000×640 map viewBox
     so every screen renders the same transport network.
     ---------------------------------------------------------- */
  const routes = [
    {
      id: "RT-A",
      name: "Route A · Bhimtal Corridor",
      short: "Route A",
      color: "#22d3ee",
      distanceKm: 18.4,
      etaMin: 42,
      status: "active",
      busId: "BUS-07",
      path: "M 92 132 C 214 158, 268 232, 372 252 S 520 302, 620 330",
      stops: [
        { id: "ST-A1", name: "Bhimtal Depot", t: 0.0, time: "07:20" },
        { id: "ST-A2", name: "Bhimtal Market", t: 0.3, time: "07:34" },
        { id: "ST-A3", name: "Sattal Junction", t: 0.58, time: "07:46" },
        { id: "ST-A4", name: "Tallital", t: 0.8, time: "07:58" },
        { id: "ST-A5", name: "College Campus", t: 1.0, time: "08:10" }
      ]
    },
    {
      id: "RT-B",
      name: "Route B · Haldwani Express",
      short: "Route B",
      color: "#3b82f6",
      distanceKm: 31.2,
      etaMin: 58,
      status: "active",
      busId: "BUS-04",
      path: "M 68 486 C 198 486, 252 428, 372 404 S 538 356, 620 330",
      stops: [
        { id: "ST-B1", name: "Haldwani Stand", t: 0.0, time: "06:55" },
        { id: "ST-B2", name: "Kathgodam", t: 0.26, time: "07:12" },
        { id: "ST-B3", name: "Ranibagh", t: 0.5, time: "07:26" },
        { id: "ST-B4", name: "Jeolikot", t: 0.76, time: "07:45" },
        { id: "ST-B5", name: "College Campus", t: 1.0, time: "08:05" }
      ]
    },
    {
      id: "RT-C",
      name: "Route C · Nainital Ridge",
      short: "Route C",
      color: "#a78bfa",
      distanceKm: 22.8,
      etaMin: 47,
      status: "active",
      busId: "BUS-12",
      path: "M 306 58 C 384 122, 424 172, 472 212 S 572 292, 620 330",
      stops: [
        { id: "ST-C1", name: "Mallital", t: 0.0, time: "07:05" },
        { id: "ST-C2", name: "Tallital", t: 0.24, time: "07:16" },
        { id: "ST-C3", name: "Bhowali", t: 0.55, time: "07:34" },
        { id: "ST-C4", name: "Bhimtal Market", t: 0.8, time: "07:52" },
        { id: "ST-C5", name: "College Campus", t: 1.0, time: "08:08" }
      ]
    },
    {
      id: "RT-D",
      name: "Route D · Bhowali Link",
      short: "Route D",
      color: "#34d399",
      distanceKm: 16.1,
      etaMin: 35,
      status: "active",
      busId: "BUS-01",
      path: "M 944 92 C 862 164, 802 204, 742 252 S 662 306, 620 330",
      stops: [
        { id: "ST-D1", name: "Bhowali Bypass", t: 0.0, time: "07:15" },
        { id: "ST-D2", name: "Ramgarh Chowk", t: 0.32, time: "07:28" },
        { id: "ST-D3", name: "Sattal Turn", t: 0.66, time: "07:41" },
        { id: "ST-D4", name: "College Campus", t: 1.0, time: "07:55" }
      ]
    },
    {
      id: "RT-E",
      name: "Route E · Kaladhungi Line",
      short: "Route E",
      color: "#fbbf24",
      distanceKm: 27.5,
      etaMin: 52,
      status: "maintenance",
      busId: "BUS-09",
      path: "M 934 566 C 852 524, 792 470, 722 420 S 656 362, 620 330",
      stops: [
        { id: "ST-E1", name: "Kaladhungi", t: 0.0, time: "06:50" },
        { id: "ST-E2", name: "Chorgalia Turn", t: 0.3, time: "07:08" },
        { id: "ST-E3", name: "Amritpur", t: 0.62, time: "07:27" },
        { id: "ST-E4", name: "College Campus", t: 1.0, time: "07:50" }
      ]
    }
  ];

  /* ---------------------------------------------------------- */
  const drivers = [
    { id: "DRV-01", name: "Rakesh Bisht", phone: "+91 94112 20481", licence: "UK-07-2019-4471", busId: "BUS-07", exp: 11, rating: 4.8, status: "on-trip" },
    { id: "DRV-02", name: "Naveen Joshi", phone: "+91 94123 77510", licence: "UK-04-2016-8820", busId: "BUS-04", exp: 8, rating: 4.5, status: "on-trip" },
    { id: "DRV-03", name: "Suraj Rawat", phone: "+91 90124 31188", licence: "UK-12-2020-1092", busId: "BUS-12", exp: 6, rating: 4.7, status: "on-trip" },
    { id: "DRV-04", name: "Mahesh Pandey", phone: "+91 98371 55402", licence: "UK-01-2014-6631", busId: "BUS-01", exp: 14, rating: 4.9, status: "off-duty" },
    { id: "DRV-05", name: "Deepak Negi", phone: "+91 97605 12234", licence: "UK-09-2021-7745", busId: "BUS-09", exp: 4, rating: 4.3, status: "standby" },
    { id: "DRV-06", name: "Harish Adhikari", phone: "+91 93190 60127", licence: "UK-03-2018-2210", busId: "BUS-03", exp: 9, rating: 4.6, status: "on-trip" }
  ];

  const conductors = [
    { id: "CND-01", name: "Anil Karki", phone: "+91 94566 22119", busId: "BUS-07", shift: "Morning", scansToday: 38, status: "on-trip" },
    { id: "CND-02", name: "Pooja Bhatt", phone: "+91 93588 41220", busId: "BUS-04", shift: "Morning", scansToday: 41, status: "on-trip" },
    { id: "CND-03", name: "Vikas Mehra", phone: "+91 90112 88031", busId: "BUS-12", shift: "Morning", scansToday: 35, status: "on-trip" },
    { id: "CND-04", name: "Sunita Arya", phone: "+91 98745 10023", busId: "BUS-01", shift: "Evening", scansToday: 44, status: "off-duty" },
    { id: "CND-05", name: "Ramesh Tamta", phone: "+91 97001 33814", busId: "BUS-03", shift: "Morning", scansToday: 29, status: "on-trip" }
  ];

  const buses = [
    { id: "BUS-07", reg: "UK 04 PA 4412", routeId: "RT-A", driverId: "DRV-01", conductorId: "CND-01", capacity: 45, occupancy: 38, status: "running", etaMin: 8, progress: 0.42, model: "Tata Starbus 2022", fuel: 78, speed: 38 },
    { id: "BUS-04", reg: "UK 04 PB 8820", routeId: "RT-B", driverId: "DRV-02", conductorId: "CND-02", capacity: 45, occupancy: 41, status: "delayed", etaMin: 24, progress: 0.28, model: "Ashok Leyland Viking", fuel: 54, speed: 21 },
    { id: "BUS-12", reg: "UK 04 PC 1109", routeId: "RT-C", driverId: "DRV-03", conductorId: "CND-03", capacity: 45, occupancy: 35, status: "running", etaMin: 12, progress: 0.63, model: "Tata Starbus 2021", fuel: 66, speed: 34 },
    { id: "BUS-01", reg: "UK 04 PA 1001", routeId: "RT-D", driverId: "DRV-04", conductorId: "CND-04", capacity: 45, occupancy: 44, status: "arrived", etaMin: 0, progress: 1, model: "Eicher Skyline Pro", fuel: 41, speed: 0 },
    { id: "BUS-09", reg: "UK 04 PD 7745", routeId: "RT-E", driverId: "DRV-05", conductorId: null, capacity: 40, occupancy: 0, status: "maintenance", etaMin: null, progress: 0.0, model: "Force Traveller 40", fuel: 88, speed: 0 },
    { id: "BUS-03", reg: "UK 04 PA 2210", routeId: "RT-A", driverId: "DRV-06", conductorId: "CND-05", capacity: 52, occupancy: 29, status: "running", etaMin: 17, progress: 0.16, model: "Tata Starbus 2023", fuel: 72, speed: 30 }
  ];

  /* Students — the demo student is Mitul Upadhyay (GEHU2026-0117) */
  const students = [
    { id: "GEHU2026-0117", name: "Mitul Upadhyay", dept: "B.Tech CSE", year: "3rd Year", busId: "BUS-07", routeId: "RT-A", stop: "Bhimtal Market", parent: "Rajesh Upadhyay", parentPhone: "+91 94100 71120", pass: "active", validity: "2026–2027", avatar: "MU", boarded: false },
    { id: "GEHU2026-0231", name: "Ananya Sharma", dept: "B.Tech CSE", year: "2nd Year", busId: "BUS-07", routeId: "RT-A", stop: "Tallital", parent: "Vivek Sharma", parentPhone: "+91 94100 88231", pass: "active", validity: "2026–2027", avatar: "AS", boarded: true },
    { id: "GEHU2026-0344", name: "Rohit Bisht", dept: "BCA", year: "1st Year", busId: "BUS-04", routeId: "RT-B", stop: "Kathgodam", parent: "Naresh Bisht", parentPhone: "+91 94100 55344", pass: "active", validity: "2026–2027", avatar: "RB", boarded: true },
    { id: "GEHU2026-0412", name: "Sneha Rawat", dept: "B.Tech ME", year: "4th Year", busId: "BUS-12", routeId: "RT-C", stop: "Bhowali", parent: "Kamal Rawat", parentPhone: "+91 94100 22412", pass: "expired", validity: "2025–2026", avatar: "SR", boarded: false },
    { id: "GEHU2026-0503", name: "Aditya Joshi", dept: "MBA", year: "1st Year", busId: "BUS-01", routeId: "RT-D", stop: "Ramgarh Chowk", parent: "Sanjay Joshi", parentPhone: "+91 94100 90503", pass: "active", validity: "2026–2027", avatar: "AJ", boarded: true },
    { id: "GEHU2026-0618", name: "Kritika Negi", dept: "B.Sc IT", year: "2nd Year", busId: "BUS-07", routeId: "RT-A", stop: "Sattal Junction", parent: "Pankaj Negi", parentPhone: "+91 94100 61618", pass: "active", validity: "2026–2027", avatar: "KN", boarded: true },
    { id: "GEHU2026-0725", name: "Yash Chauhan", dept: "B.Tech CSE", year: "3rd Year", busId: "BUS-03", routeId: "RT-A", stop: "Bhimtal Depot", parent: "Manoj Chauhan", parentPhone: "+91 94100 33725", pass: "active", validity: "2026–2027", avatar: "YC", boarded: false },
    { id: "GEHU2026-0839", name: "Priya Mehta", dept: "BBA", year: "2nd Year", busId: "BUS-12", routeId: "RT-C", stop: "Mallital", parent: "Alok Mehta", parentPhone: "+91 94100 77839", pass: "active", validity: "2026–2027", avatar: "PM", boarded: true },
    { id: "GEHU2026-0944", name: "Karan Bhatt", dept: "B.Tech CE", year: "1st Year", busId: "BUS-04", routeId: "RT-B", stop: "Jeolikot", parent: "Girish Bhatt", parentPhone: "+91 94100 11944", pass: "active", validity: "2026–2027", avatar: "KB", boarded: true },
    { id: "GEHU2026-1052", name: "Isha Pandey", dept: "B.Sc Bio", year: "3rd Year", busId: "BUS-01", routeId: "RT-D", stop: "Bhowali Bypass", parent: "Dinesh Pandey", parentPhone: "+91 94100 45052", pass: "active", validity: "2026–2027", avatar: "IP", boarded: true },
    { id: "GEHU2026-1177", name: "Tanmay Sah", dept: "BCA", year: "3rd Year", busId: "BUS-07", routeId: "RT-A", stop: "Bhimtal Market", parent: "Umesh Sah", parentPhone: "+91 94100 66177", pass: "active", validity: "2026–2027", avatar: "TS", boarded: false },
    { id: "GEHU2026-1290", name: "Nikita Verma", dept: "B.Tech CSE", year: "4th Year", busId: "BUS-03", routeId: "RT-A", stop: "Bhimtal Market", parent: "Sudhir Verma", parentPhone: "+91 94100 98290", pass: "active", validity: "2026–2027", avatar: "NV", boarded: true }
  ];

  const attendance = [
    { id: "AT-1041", studentId: "GEHU2026-0231", busId: "BUS-07", stop: "Tallital", time: "07:38 AM", status: "present", method: "QR" },
    { id: "AT-1042", studentId: "GEHU2026-0618", busId: "BUS-07", stop: "Sattal Junction", time: "07:46 AM", status: "present", method: "QR" },
    { id: "AT-1043", studentId: "GEHU2026-0344", busId: "BUS-04", stop: "Kathgodam", time: "07:12 AM", status: "present", method: "QR" },
    { id: "AT-1044", studentId: "GEHU2026-0944", busId: "BUS-04", stop: "Jeolikot", time: "07:45 AM", status: "present", method: "QR" },
    { id: "AT-1045", studentId: "GEHU2026-0839", busId: "BUS-12", stop: "Mallital", time: "07:05 AM", status: "present", method: "QR" },
    { id: "AT-1046", studentId: "GEHU2026-0503", busId: "BUS-01", stop: "Ramgarh Chowk", time: "07:28 AM", status: "present", method: "QR" },
    { id: "AT-1047", studentId: "GEHU2026-1052", busId: "BUS-01", stop: "Bhowali Bypass", time: "07:15 AM", status: "present", method: "Manual" },
    { id: "AT-1048", studentId: "GEHU2026-1290", busId: "BUS-03", stop: "Bhimtal Market", time: "07:33 AM", status: "present", method: "QR" }
  ];

  const leaveRequests = [
    { id: "LV-2041", studentId: "GEHU2026-1177", from: "2026-08-19", to: "2026-08-21", reason: "Family function at Almora.", status: "pending", raised: "2 h ago" },
    { id: "LV-2042", studentId: "GEHU2026-0412", from: "2026-08-18", to: "2026-08-18", reason: "Medical appointment — Sushila Tiwari Hospital.", status: "pending", raised: "5 h ago" },
    { id: "LV-2043", studentId: "GEHU2026-0725", from: "2026-08-20", to: "2026-08-24", reason: "Inter-college sports meet, Dehradun.", status: "approved", raised: "Yesterday" },
    { id: "LV-2044", studentId: "GEHU2026-0231", from: "2026-08-15", to: "2026-08-16", reason: "Travelling home for Independence Day weekend.", status: "approved", raised: "3 d ago" },
    { id: "LV-2045", studentId: "GEHU2026-0503", from: "2026-08-12", to: "2026-08-12", reason: "Internship interview.", status: "rejected", raised: "6 d ago" }
  ];

  const complaints = [
    { id: "CM-3011", studentId: "GEHU2026-0344", busId: "BUS-04", category: "Delay", text: "Bus reached Kathgodam 20 minutes late for three consecutive days.", status: "open", priority: "high", raised: "1 h ago" },
    { id: "CM-3012", studentId: "GEHU2026-0839", busId: "BUS-12", category: "Cleanliness", text: "Rear seats were not cleaned before the morning trip.", status: "in-review", priority: "medium", raised: "4 h ago" },
    { id: "CM-3013", studentId: "GEHU2026-0117", busId: "BUS-07", category: "Overcrowding", text: "Standing passengers beyond capacity between Tallital and campus.", status: "resolved", priority: "medium", raised: "Yesterday" },
    { id: "CM-3014", studentId: "GEHU2026-1052", busId: "BUS-01", category: "Driving", text: "Requested a slower speed on the Bhowali descent.", status: "open", priority: "high", raised: "2 d ago" }
  ];

  const notifications = [
    { id: "NT-9001", type: "boarding", title: "Ananya boarded BUS-07", body: "Scanned at Tallital · 07:38 AM", time: "07:38 AM", read: false, audience: ["admin", "parent", "student"] },
    { id: "NT-9002", type: "delay", title: "BUS-04 delayed by 8 minutes", body: "Traffic congestion reported near Ranibagh.", time: "07:41 AM", read: false, audience: ["admin", "parent", "student", "driver"] },
    { id: "NT-9003", type: "arrival", title: "BUS-01 reached college", body: "Route D completed · 44/45 students onboard.", time: "07:55 AM", read: false, audience: ["admin", "parent"] },
    { id: "NT-9004", type: "leave", title: "Leave request approved", body: "LV-2043 · Yash Chauhan · 20–24 Aug.", time: "Yesterday", read: true, audience: ["admin", "student"] },
    { id: "NT-9005", type: "sos", title: "Emergency reported on BUS-04", body: "SOS raised near Jeolikot — resolved by transport desk.", time: "Yesterday", read: true, audience: ["admin", "driver"] }
  ];


  /* ----------------------------------------------------------
     ROSTER GENERATOR
     The hand-written students above are the demo cast. Each bus
     also needs a believable full roster so manifests, occupancy
     and attendance figures agree with one another.
     ---------------------------------------------------------- */
  const FIRST = ["Aarav", "Ishita", "Kabir", "Meera", "Dev", "Riya", "Aryan", "Tanvi", "Harsh", "Naina",
    "Om", "Diya", "Vivaan", "Saanvi", "Kunal", "Anushka", "Raghav", "Pari", "Shaurya", "Aditi",
    "Nakul", "Bhavya", "Girish", "Trisha", "Manav", "Jiya", "Lakshya", "Avni", "Rudra", "Kavya",
    "Pranav", "Sana", "Vihaan", "Reet", "Arnav", "Nidhi", "Samar", "Ira", "Yuvraj", "Charu"];
  const LAST = ["Bisht", "Joshi", "Rawat", "Negi", "Pandey", "Bhatt", "Sah", "Verma", "Chauhan", "Mehra",
    "Tamta", "Arya", "Karki", "Adhikari", "Upreti", "Nainwal", "Bora", "Dhami", "Kandpal", "Sati"];
  const DEPTS = ["B.Tech CSE", "B.Tech ME", "B.Tech CE", "BCA", "MBA", "BBA", "B.Sc IT", "B.Sc Bio", "B.Com"];
  const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  function buildRoster() {
    let seedNum = 7919;
    const rnd = function () {
      seedNum = (seedNum * 1103515245 + 12345) % 2147483648;
      return seedNum / 2147483648;
    };
    const pick = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
    let serial = 1300;

    buses.forEach(function (bus) {
      if (bus.status === "maintenance") return;
      const route = routes.find(function (r) { return r.id === bus.routeId; });
      const stops = route.stops.slice(0, -1);
      const existing = students.filter(function (s) { return s.busId === bus.id; });
      let boardedLeft = bus.occupancy - existing.filter(function (s) { return s.boarded; }).length;
      const need = Math.max(0, bus.capacity - existing.length - 2);

      for (let i = 0; i < need; i++) {
        const name = pick(FIRST) + " " + pick(LAST);
        const stop = pick(stops);
        const boarded = boardedLeft > 0;
        if (boarded) boardedLeft--;
        serial += 7;
        const id = "GEHU2026-" + String(serial).padStart(4, "0");
        students.push({
          id: id,
          name: name,
          dept: pick(DEPTS),
          year: pick(YEARS),
          busId: bus.id,
          routeId: bus.routeId,
          stop: stop.name,
          parent: pick(["Mr.", "Mrs."]) + " " + name.split(" ")[1],
          parentPhone: "+91 9" + String(Math.floor(rnd() * 900000000) + 100000000),
          pass: rnd() > 0.97 ? "expired" : "active",
          validity: "2026–2027",
          avatar: name.split(" ").map(function (w) { return w[0]; }).join(""),
          boarded: boarded
        });
        if (boarded) {
          const mins = 5 + Math.floor(rnd() * 50);
          attendance.push({
            id: "AT-" + (2000 + serial),
            studentId: id,
            busId: bus.id,
            stop: stop.name,
            time: "07:" + String(mins).padStart(2, "0") + " AM",
            status: "present",
            method: rnd() > 0.92 ? "Manual" : "QR"
          });
        }
      }
    });
    /* keep occupancy exactly in step with the generated roster */
    buses.forEach(function (bus) {
      if (bus.status === "maintenance") return;
      bus.occupancy = students.filter(function (s) { return s.busId === bus.id && s.boarded; }).length;
    });
  }
  buildRoster();

  /* KPI figures shown on the admin dashboard */
  const metrics = {
    activeBuses: 12,
    totalStudents: 1284,
    attendanceRate: 94.8,
    activeRoutes: 38,
    alerts: 3,
    pendingLeaves: 17,
    onTimeRate: 91.2,
    avgDelay: 6.4,
    fuelEfficiency: 5.8,
    kmToday: 412
  };

  const college = { name: "Graphic Era Hills University", campus: "Bhimtal Campus", x: 620, y: 330 };

  /* Weekly attendance for report charts */
  const weekly = [
    { day: "Mon", present: 1188, total: 1284 },
    { day: "Tue", present: 1211, total: 1284 },
    { day: "Wed", present: 1164, total: 1284 },
    { day: "Thu", present: 1230, total: 1284 },
    { day: "Fri", present: 1218, total: 1284 },
    { day: "Sat", present: 1042, total: 1284 }
  ];

  /* ----------------------------------------------------------
     STORE — tiny reactive layer (subscribe / emit / persist)
     ---------------------------------------------------------- */
  function seed() {
    return {
      version: 3,
      routes: clone(routes),
      buses: clone(buses),
      students: clone(students),
      drivers: clone(drivers),
      conductors: clone(conductors),
      attendance: clone(attendance),
      leaveRequests: clone(leaveRequests),
      complaints: clone(complaints),
      notifications: clone(notifications),
      metrics: clone(metrics),
      weekly: clone(weekly),
      college: clone(college),
      demoStudentId: "GEHU2026-0117"
    };
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  const listeners = new Map();
  let seq = 100;

  const state = load();

  function load() {
    const base = seed();
    try {
      const raw = global.localStorage && localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== base.version) return base;
      // Merge only the mutable slices; geometry/config always comes from seed.
      base.attendance = saved.attendance || base.attendance;
      base.notifications = saved.notifications || base.notifications;
      base.leaveRequests = saved.leaveRequests || base.leaveRequests;
      base.complaints = saved.complaints || base.complaints;
      base.metrics = Object.assign(base.metrics, saved.metrics || {});
      (saved.students || []).forEach(function (s) {
        const t = base.students.find(function (x) { return x.id === s.id; });
        if (t) { t.boarded = s.boarded; t.pass = s.pass; }
      });
      (saved.buses || []).forEach(function (b) {
        const t = base.buses.find(function (x) { return x.id === b.id; });
        if (t) { t.occupancy = b.occupancy; t.status = b.status; }
      });
      return base;
    } catch (e) {
      return base;
    }
  }

  function persist() {
    try {
      if (!global.localStorage) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: state.version,
        attendance: state.attendance,
        notifications: state.notifications,
        leaveRequests: state.leaveRequests,
        complaints: state.complaints,
        metrics: state.metrics,
        students: state.students.map(function (s) { return { id: s.id, boarded: s.boarded, pass: s.pass }; }),
        buses: state.buses.map(function (b) { return { id: b.id, occupancy: b.occupancy, status: b.status }; })
      }));
    } catch (e) { /* storage disabled — prototype still works in-memory */ }
  }

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return function off() { listeners.get(event).delete(fn); };
  }

  function emit(event, payload) {
    (listeners.get(event) || []).forEach(function (fn) { fn(payload); });
    if (event !== "*") (listeners.get("*") || []).forEach(function (fn) { fn(event, payload); });
  }

  /* ---------------- selectors ---------------- */
  const get = {
    bus: function (id) { return state.buses.find(function (b) { return b.id === id; }); },
    route: function (id) { return state.routes.find(function (r) { return r.id === id; }); },
    student: function (id) { return state.students.find(function (s) { return s.id === id; }); },
    driver: function (id) { return state.drivers.find(function (d) { return d.id === id; }); },
    conductor: function (id) { return state.conductors.find(function (c) { return c.id === id; }); },
    demoStudent: function () { return get.student(state.demoStudentId); },
    studentsOnBus: function (busId) { return state.students.filter(function (s) { return s.busId === busId; }); },
    attendanceFor: function (busId) {
      return state.attendance.filter(function (a) { return !busId || a.busId === busId; });
    },
    unread: function (audience) {
      return state.notifications.filter(function (n) {
        return !n.read && (!audience || !n.audience || n.audience.indexOf(audience) > -1);
      }).length;
    },
    notificationsFor: function (audience) {
      return state.notifications.filter(function (n) {
        return !audience || !n.audience || n.audience.indexOf(audience) > -1;
      });
    },
    driverOf: function (busId) { return state.drivers.find(function (d) { return d.busId === busId; }); },
    conductorOf: function (busId) { return state.conductors.find(function (c) { return c.busId === busId; }); },
    /* Occupancy across the fleet, used by admin KPI + reports */
    fleetOccupancy: function () {
      const active = state.buses.filter(function (b) { return b.status !== "maintenance"; });
      const occ = active.reduce(function (a, b) { return a + b.occupancy; }, 0);
      const cap = active.reduce(function (a, b) { return a + b.capacity; }, 0);
      return cap ? Math.round((occ / cap) * 100) : 0;
    }
  };

  /* ---------------- actions ---------------- */
  function nowTime() {
    return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  }

  const actions = {
    /** Conductor scans a student's QR pass → the whole system reacts. */
    markAttendance: function (studentId, opts) {
      const student = get.student(studentId);
      if (!student) return null;
      if (state.attendance.some(function (a) { return a.studentId === studentId; })) {
        return { duplicate: true, student: student };
      }
      const bus = get.bus(student.busId);
      const record = {
        id: "AT-" + (++seq + 1000),
        studentId: studentId,
        busId: student.busId,
        stop: (opts && opts.stop) || student.stop,
        time: nowTime(),
        status: "present",
        method: (opts && opts.method) || "QR"
      };
      state.attendance.unshift(record);
      student.boarded = true;
      if (bus) bus.occupancy = Math.min(bus.capacity, bus.occupancy + 1);
      state.metrics.attendanceRate = Math.min(99.9, Math.round((state.metrics.attendanceRate + 0.1) * 10) / 10);

      actions.notify({
        type: "boarding",
        title: student.name.split(" ")[0] + " boarded " + student.busId,
        body: "Scanned at " + record.stop + " · " + record.time,
        audience: ["admin", "parent", "student", "conductor"]
      }, { silent: true });

      persist();
      emit("attendance:marked", { record: record, student: student, bus: bus });
      emit("state:change", { reason: "attendance" });
      return { record: record, student: student, bus: bus };
    },

    resetAttendanceDemo: function () {
      state.attendance = clone(attendance);
      state.students.forEach(function (s) {
        const seeded = students.find(function (x) { return x.id === s.id; });
        s.boarded = seeded ? seeded.boarded : false;
      });
      state.buses.forEach(function (b) {
        const seeded = buses.find(function (x) { return x.id === b.id; });
        if (seeded) b.occupancy = seeded.occupancy;
      });
      state.metrics.attendanceRate = metrics.attendanceRate;
      persist();
      emit("state:change", { reason: "reset" });
    },

    notify: function (n, opts) {
      const item = Object.assign({
        id: "NT-" + (++seq + 9000),
        type: "info",
        title: "Notification",
        body: "",
        time: nowTime(),
        read: false,
        audience: ["admin"]
      }, n);
      state.notifications.unshift(item);
      if (state.notifications.length > 40) state.notifications.pop();
      persist();
      emit("notification", { item: item, silent: !!(opts && opts.silent) });
      emit("state:change", { reason: "notification" });
      return item;
    },

    markNotificationRead: function (id) {
      const n = state.notifications.find(function (x) { return x.id === id; });
      if (n) n.read = true;
      persist();
      emit("state:change", { reason: "notification-read" });
    },

    markAllRead: function (audience) {
      get.notificationsFor(audience).forEach(function (n) { n.read = true; });
      persist();
      emit("state:change", { reason: "notification-read" });
    },

    setBusStatus: function (busId, status, etaMin) {
      const bus = get.bus(busId);
      if (!bus) return;
      bus.status = status;
      if (typeof etaMin === "number") bus.etaMin = etaMin;
      if (status === "arrived") { bus.etaMin = 0; bus.progress = 1; bus.speed = 0; }
      persist();
      emit("bus:update", { bus: bus });
      emit("state:change", { reason: "bus-status" });
    },

    setLeaveStatus: function (id, status) {
      const lv = state.leaveRequests.find(function (l) { return l.id === id; });
      if (!lv) return;
      lv.status = status;
      if (status !== "pending") {
        state.metrics.pendingLeaves = Math.max(0, state.metrics.pendingLeaves - 1);
      }
      const student = get.student(lv.studentId);
      actions.notify({
        type: "leave",
        title: "Leave request " + status,
        body: lv.id + " · " + (student ? student.name : lv.studentId),
        audience: ["admin", "student", "parent"]
      }, { silent: true });
      persist();
      emit("leave:update", { leave: lv });
      emit("state:change", { reason: "leave" });
    },

    addLeaveRequest: function (data) {
      const lv = Object.assign({
        id: "LV-" + (++seq + 2000),
        studentId: state.demoStudentId,
        status: "pending",
        raised: "Just now"
      }, data);
      state.leaveRequests.unshift(lv);
      state.metrics.pendingLeaves += 1;
      actions.notify({
        type: "leave",
        title: "New leave request",
        body: lv.id + " · " + (get.student(lv.studentId) || {}).name + " · " + lv.from + " → " + lv.to,
        audience: ["admin"]
      }, { silent: true });
      persist();
      emit("state:change", { reason: "leave-new" });
      return lv;
    },

    setComplaintStatus: function (id, status) {
      const c = state.complaints.find(function (x) { return x.id === id; });
      if (c) c.status = status;
      persist();
      emit("state:change", { reason: "complaint" });
    },

    addComplaint: function (data) {
      const c = Object.assign({
        id: "CM-" + (++seq + 3000),
        studentId: state.demoStudentId,
        status: "open",
        priority: "medium",
        raised: "Just now"
      }, data);
      state.complaints.unshift(c);
      actions.notify({
        type: "complaint",
        title: "New complaint · " + c.category,
        body: c.id + " · " + c.busId,
        audience: ["admin"]
      }, { silent: true });
      persist();
      emit("state:change", { reason: "complaint-new" });
      return c;
    },

    addBus: function (data) {
      const bus = Object.assign({
        id: data.id || "BUS-" + String(state.buses.length + 1).padStart(2, "0"),
        capacity: 45,
        occupancy: 0,
        status: "idle",
        etaMin: null,
        progress: 0,
        fuel: 100,
        speed: 0,
        model: "Tata Starbus 2024"
      }, data);
      state.buses.push(bus);
      state.metrics.activeBuses += 1;
      actions.notify({
        type: "fleet",
        title: bus.id + " added to fleet",
        body: bus.reg + " · assigned to " + (get.route(bus.routeId) || {}).short,
        audience: ["admin"]
      }, { silent: true });
      emit("state:change", { reason: "bus-added" });
      return bus;
    },

    removeBus: function (id) {
      const i = state.buses.findIndex(function (b) { return b.id === id; });
      if (i > -1) {
        state.buses.splice(i, 1);
        state.metrics.activeBuses = Math.max(0, state.metrics.activeBuses - 1);
        emit("state:change", { reason: "bus-removed" });
      }
    },

    raiseSOS: function (payload) {
      const p = payload || {};
      state.metrics.alerts += 1;
      const item = actions.notify({
        type: "sos",
        title: "EMERGENCY · SOS from " + (p.from || "Student"),
        body: (p.busId || "BUS-07") + " · " + (p.location || "Bhimtal Market") + " · transport desk alerted",
        audience: ["admin", "driver", "parent", "conductor"]
      });
      emit("sos", { item: item });
      return item;
    }
  };

  /* ---------------- session (mock auth) ---------------- */
  const session = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
      catch (e) { return null; }
    },
    set: function (role, name) {
      const s = { role: role, name: name || defaultName(role), at: Date.now() };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
      return s;
    },
    clear: function () { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  };

  function defaultName(role) {
    return ({
      admin: "Dr. Anjali Rawat",
      student: "Mitul Upadhyay",
      parent: "Rajesh Upadhyay",
      driver: "Rakesh Bisht",
      conductor: "Anil Karki"
    })[role] || "Guest";
  }

  const roles = {
    admin: { label: "Administrator", page: "pages/admin.html", desc: "Full system control.", accent: "#22d3ee" },
    student: { label: "Student", page: "pages/student.html", desc: "Track bus, ETA, digital pass, leave and SOS.", accent: "#3b82f6" },
    parent: { label: "Parent", page: "pages/parent.html", desc: "Track child, boarding and arrival notifications.", accent: "#34d399" },
    driver: { label: "Driver", page: "pages/driver.html", desc: "Manage trips, routes and bus status.", accent: "#fbbf24" },
    conductor: { label: "Conductor", page: "pages/conductor.html", desc: "Scan QR passes and manage attendance.", accent: "#a78bfa" }
  };

  /* Cross-tab / cross-page sync: reload slices when another tab writes. */
  if (global.addEventListener) {
    global.addEventListener("storage", function (e) {
      if (e.key !== STORAGE_KEY) return;
      const fresh = load();
      state.attendance = fresh.attendance;
      state.notifications = fresh.notifications;
      state.leaveRequests = fresh.leaveRequests;
      state.complaints = fresh.complaints;
      state.metrics = fresh.metrics;
      state.students = fresh.students;
      state.buses.forEach(function (b) {
        const f = fresh.buses.find(function (x) { return x.id === b.id; });
        if (f) { b.occupancy = f.occupancy; b.status = f.status; }
      });
      emit("state:change", { reason: "sync" });
    });
  }

  global.BusFlow = global.BusFlow || {};
  global.BusFlow.state = state;
  global.BusFlow.get = get;
  global.BusFlow.actions = actions;
  global.BusFlow.on = on;
  global.BusFlow.emit = emit;
  global.BusFlow.persist = persist;
  global.BusFlow.session = session;
  global.BusFlow.roles = roles;
  global.BusFlow.resetAll = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  };
})(window);
