// ============================================================
// DEMO data - FRONTEND ONLY (kept here, never sent to backend).
// Used so the ID card pages work before any real data exists.
// ============================================================

export const DEMO_STUDENTS = [
  { id: "demo-s1", enrollment: "1001", name: "Aarav Sharma", role: "STUDENT", className: "5", section: "A", fatherName: "Rajesh Sharma", motherName: "Sunita Sharma", dob: "2016-05-10", phone: "9876543210", email: "aarav@example.com", validTill: "31 Mar 2027" },
  { id: "demo-s2", enrollment: "1002", name: "Diya Verma", role: "STUDENT", className: "5", section: "A", fatherName: "Ramesh Verma", motherName: "Sita Verma", dob: "2016-08-22", phone: "9876543211", email: "diya@example.com", validTill: "31 Mar 2027" },
  { id: "demo-s3", enrollment: "1003", name: "Rohan Gupta", role: "STUDENT", className: "4", section: "B", fatherName: "Sanjay Gupta", motherName: "Priya Gupta", dob: "2017-01-14", phone: "9876543212", email: "rohan@example.com", validTill: "31 Mar 2027" },
  { id: "demo-s4", enrollment: "1004", name: "Ananya Singh", role: "STUDENT", className: "3", section: "A", fatherName: "Vikram Singh", motherName: "Neha Singh", dob: "2018-03-05", phone: "9876543213", email: "ananya@example.com", validTill: "31 Mar 2027" },
];

export const DEMO_TEACHERS = [
  { id: "demo-t1", employeeId: "TCH-100", name: "Mrs. Kavita Mishra", role: "TEACHER", subject: "English", qualification: "M.A. (English), B.Ed.", phone: "9812345601", email: "kavita@cves.in", validTill: "31 Mar 2027" },
  { id: "demo-t2", employeeId: "TCH-101", name: "Mr. Arun Yadav", role: "TEACHER", subject: "Mathematics", qualification: "M.Sc. (Math), B.Ed.", phone: "9812345602", email: "arun@cves.in", validTill: "31 Mar 2027" },
  { id: "demo-t3", employeeId: "TCH-102", name: "Ms. Pooja Singh", role: "TEACHER", subject: "Science", qualification: "M.Sc. (Physics)", phone: "9812345603", email: "pooja@cves.in", validTill: "31 Mar 2027" },
  { id: "demo-t4", employeeId: "TCH-103", name: "Mr. Ravi Pandey", role: "TEACHER", subject: "Computer", qualification: "B.Tech (CSE)", phone: "9812345604", email: "ravi@cves.in", validTill: "31 Mar 2027" },
];

export const DEMO_STAFF = [
  { id: "demo-st1", employeeId: "STF-200", name: "Mr. Suresh Kumar", role: "STAFF", department: "Transport", designation: "Bus Driver", phone: "9812345701", validTill: "31 Mar 2027" },
  { id: "demo-st2", employeeId: "STF-201", name: "Mrs. Rekha Devi", role: "STAFF", department: "Housekeeping", designation: "Housekeeping Staff", phone: "9812345702", validTill: "31 Mar 2027" },
  { id: "demo-st3", employeeId: "STF-202", name: "Mr. Manoj Kumar", role: "STAFF", department: "Admin", designation: "Clerk", phone: "9812345703", validTill: "31 Mar 2027" },
  { id: "demo-st4", employeeId: "STF-203", name: "Mr. Vijay Sharma", role: "STAFF", department: "Security", designation: "Security Guard", phone: "9812345704", validTill: "31 Mar 2027" },
];

export const DEMO_ADMINS = [
  { id: "demo-a1", employeeId: "ADM-001", name: "Dr. R. K. Singh", role: "ADMIN", designation: "Principal", email: "principal@cves.in", phone: "9812345801", validTill: "31 Mar 2027" },
  { id: "demo-a2", employeeId: "ADM-002", name: "Mrs. Geeta Srivastava", role: "ADMIN", designation: "Vice Principal", email: "geeta@cves.in", phone: "9812345802", validTill: "31 Mar 2027" },
  { id: "demo-a3", employeeId: "ADM-003", name: "Mr. Rahul Sharma", role: "ADMIN", designation: "Administrator", email: "rahul@cves.in", phone: "9812345803", validTill: "31 Mar 2027" },
];

export const isDemo = (id) => String(id).startsWith("demo-");