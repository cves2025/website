export interface StudentFormValues {
  firstName: string;
  lastName: string;
  enrollment: string;
  className: string;
  section: string;
  fatherName: string;
  motherName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  academicYear: string;
}

export interface StoredStudent extends StudentFormValues {
  id: number;
}