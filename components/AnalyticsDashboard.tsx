'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { fetchStudentsWithAttendance } from '@/lib/supabase-utils'
import { Student } from '@/lib/types'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AnalyticsDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [analyticsDateRange, setAnalyticsDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchStudentsWithAttendance()
        setStudents(data)
      } catch (error) {
        console.error('Error fetching students:', error)
      }
    }
    fetchData()
  }, [])

  const getAttendanceRate = (student: Student, startDate: Date, endDate: Date) => {
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const presentDays = student.attendance.filter(a => {
      const attendanceDate = parseISO(a.date)
      return attendanceDate >= startDate && attendanceDate <= endDate && a.status === 'present'
    }).length
    return (presentDays / totalDays) * 100
  }

  const attendanceTrends = useMemo(() => {
    const daysInRange = Math.floor((analyticsDateRange.to.getTime() - analyticsDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Array.from({ length: daysInRange }, (_, index) => {
      const date = new Date(analyticsDateRange.from.getTime() + index * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      return {
        date: dateStr,
        present: students.filter(student => 
          student.attendance.find(a => a.date === dateStr && a.status === 'present')
        ).length,
        absent: students.filter(student => 
          student.attendance.find(a => a.date === dateStr && a.status === 'absent')
        ).length,
      }
    })
  }, [students, analyticsDateRange])

  const attendanceByDayOfWeek = useMemo(() => {
    const counts = daysOfWeek.map(day => ({
      day,
      present: 0,
      absent: 0,
    }))

    students.forEach(student => {
      student.attendance.forEach(record => {
        const attendanceDate = parseISO(record.date)
        if (attendanceDate >= analyticsDateRange.from && attendanceDate <= analyticsDateRange.to) {
          const dayIndex = attendanceDate.getDay()
          counts[dayIndex][record.status]++
        }
      })
    })

    const total = counts.reduce((sum, day) => sum + day.present + day.absent, 0)
    return counts.map(({ day, ...statuses }) => ({
      day,
      ...Object.fromEntries(
        Object.entries(statuses).map(([status, count]) => [status, (count / total) * 100])
      )
    }))
  }, [students, analyticsDateRange])

  return (
    <div className="container mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Date Range</CardTitle>
          <CardDescription>Select the date range for analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {format(analyticsDateRange.from, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={analyticsDateRange.from}
                  onSelect={(date) => date && setAnalyticsDateRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {format(analyticsDateRange.to, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={analyticsDateRange.to}
                  onSelect={(date) => date && setAnalyticsDateRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Daily attendance over the selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#8884d8" />
                <Line type="monotone" dataKey="absent" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance by Day of Week</CardTitle>
            <CardDescription>Percentage of attendance for each day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceByDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#8884d8" />
                <Bar dataKey="absent" stackId="a" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}