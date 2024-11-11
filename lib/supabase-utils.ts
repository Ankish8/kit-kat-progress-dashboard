import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Student, AttendanceRecord } from './types'

export async function fetchStudentsWithAttendance() {
  const supabase = createClientComponentClient()
  
  try {
    // Fetch students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
    
    if (studentsError) throw studentsError

    // Fetch all attendance records
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
    
    if (attendanceError) throw attendanceError

    // Map attendance records to students
    return students.map(student => ({
      ...student,
      attendance: attendanceRecords
        .filter(record => record.student_id === student.id)
        .map(record => ({
          date: record.date,
          status: record.status
        }))
    }))
  } catch (error) {
    console.error('Error fetching data:', error)
    return []
  }
}

export async function updateAttendance(studentId: number, date: string, status: 'present' | 'absent') {
  const supabase = createClientComponentClient()

  try {
    // First try to update existing record
    const { data, error: upsertError } = await supabase
      .from('attendance')
      .upsert(
        {
          student_id: studentId,
          date,
          status
        },
        {
          onConflict: 'student_id,date',
          ignoreDuplicates: false
        }
      )

    if (upsertError) throw upsertError

    // Update student's streak if marking present
    if (status === 'present') {
      const { data: student } = await supabase
        .from('students')
        .select('streak, lastAttendance')
        .eq('id', studentId)
        .single()

      if (student) {
        const isConsecutive = student.lastAttendance &&
          (new Date(date).getTime() - new Date(student.lastAttendance).getTime()) / (1000 * 3600 * 24) <= 1

        const newStreak = isConsecutive ? student.streak + 1 : 1

        const { error: updateError } = await supabase
          .from('students')
          .update({
            streak: newStreak,
            lastAttendance: date
          })
          .eq('id', studentId)

        if (updateError) throw updateError
      }
    }

    return true
  } catch (error) {
    console.error('Error updating attendance:', error)
    return false
  }
}