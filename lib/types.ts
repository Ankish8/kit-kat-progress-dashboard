// Update the interface in lib/types.ts to include
export interface Student {
    id: number;
    name: string;
    email: string;
    avatar: string;
    kitKatPoints: number;
    xp: number;
    streak: number;
    lastAttendance: string | null;
    attendance: AttendanceRecord[];
  }
  
  export interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent';
  }
  
  // Used for Supabase
  export type StudentRow = Omit<Student, 'attendance'>;