'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addDays, subDays, parseISO, differenceInDays, startOfWeek, endOfWeek } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'
import { Calendar } from "@/components/ui/calendar" // Add this

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { CalendarIcon, Download, QrCode, Search, UserCheck, UserX, AlertTriangle, Users, Check, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Student, AttendanceRecord } from '@/lib/types'
import { fetchStudentsWithAttendance, updateAttendance, updateStudentStreak } from '@/lib/supabase-utils'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AttendanceDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [qrCodeData, setQrCodeData] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [analyticsDateRange, setAnalyticsDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [weeklyAttendanceRate, setWeeklyAttendanceRate] = useState(0)
  const [attendanceTrend, setAttendanceTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [filterOption, setFilterOption] = useState<'all' | 'present' | 'absent'>('all')
  const [activeTab, setActiveTab] = useState('attendance')



  

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const data = await fetchStudentsWithAttendance()
        setStudents(data)
      } catch (error) {
        console.error('Error fetching students:', error)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (students.length === 0) return

    const startOfCurrentWeek = startOfWeek(new Date())
    const endOfCurrentWeek = endOfWeek(new Date())
    const weeklyRate = students.reduce((sum, student) => {
      const studentWeeklyRate = getAttendanceRate(student, startOfCurrentWeek, endOfCurrentWeek)
      return sum + studentWeeklyRate
    }, 0) / students.length
    setWeeklyAttendanceRate(weeklyRate)

    const previousWeekStart = subDays(startOfCurrentWeek, 7)
    const previousWeekEnd = subDays(endOfCurrentWeek, 7)
    const previousWeekRate = students.reduce((sum, student) => {
      const studentPreviousWeekRate = getAttendanceRate(student, previousWeekStart, previousWeekEnd)
      return sum + studentPreviousWeekRate
    }, 0) / students.length

    if (weeklyRate > previousWeekRate) {
      setAttendanceTrend('up')
    } else if (weeklyRate < previousWeekRate) {
      setAttendanceTrend('down')
    } else {
      setAttendanceTrend('stable')
    }
  }, [students])

  const generateQRCode = useCallback(() => {
    const data = JSON.stringify({
      date: new Date().toISOString(),
      action: 'mark_attendance'
    })
    setQrCodeData(data)
    setIsQRDialogOpen(true)
  }, [])

  const markAttendance = useCallback(async (studentId: number, status: 'present' | 'absent') => {
    const today = selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    
    try {
      // Update Supabase first
      const success = await updateAttendance(studentId, today, status)
      
      if (success) {
        // If Supabase update successful, update local state
        setStudents(prevStudents =>
          prevStudents.map(student => {
            if (student.id === studentId) {
              const newAttendance = student.attendance.filter(a => a.date !== today)
              newAttendance.push({ date: today, status })
              
              const isConsecutive = student.lastAttendance &&
                (new Date(today).getTime() - new Date(student.lastAttendance).getTime()) / (1000 * 3600 * 24) <= 1
              
              const newStreak = status === 'present' ? (isConsecutive ? student.streak + 1 : 1) : 0
              
              return {
                ...student,
                attendance: newAttendance,
                streak: newStreak,
                lastAttendance: status === 'present' ? today : null
              }
            }
            return student
          })
        )
      } else {
        // If update failed, refresh data from server
        const freshData = await fetchStudentsWithAttendance()
        setStudents(freshData)
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      // Refresh data from server on error
      const freshData = await fetchStudentsWithAttendance()
      setStudents(freshData)
    }
  }, [students, selectedDate])

  const getAttendanceStatus = (student: Student, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return student.attendance.find(a => a.date === dateStr)?.status || 'absent'
  }
  
  const getAttendanceRate = (student: Student, startDate: Date, endDate: Date) => {
    const totalDays = differenceInDays(endDate, startDate) + 1
    const presentDays = student.attendance.filter(a => {
      const attendanceDate = parseISO(a.date)
      return attendanceDate >= startDate && attendanceDate <= endDate && a.status === 'present'
    }).length
    return (presentDays / totalDays) * 100
  }

  const filteredStudents = useMemo(() =>
    students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterOption === 'all' || getAttendanceStatus(student, selectedDate || new Date()) === filterOption)
    ),
    [students, searchTerm, filterOption, getAttendanceStatus, selectedDate]
  )

  const totalStudents = students.length
  const presentToday = students.filter(student => getAttendanceStatus(student, selectedDate || new Date()) === 'present').length
  const averageAttendance = useMemo(() => {
    if (students.length === 0) return 0
    return students.reduce((sum, student) => sum + getAttendanceRate(student, analyticsDateRange.from, analyticsDateRange.to), 0) / students.length
  }, [students, getAttendanceRate, analyticsDateRange])

  const attendanceTrends = useMemo(() => {
    const daysInRange = differenceInDays(analyticsDateRange.to, analyticsDateRange.from) + 1
    return Array.from({ length: daysInRange }, (_, index) => {
      const date = addDays(analyticsDateRange.from, index)
      const dateStr = date.toISOString().split('T')[0]
      return {
        date: dateStr,
        present: students.filter(student => student.attendance.find(a => a.date === dateStr && a.status === 'present')).length,
        absent: students.filter(student => student.attendance.find(a => a.date === dateStr && a.status === 'absent')).length,
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

  const exportAttendance = useCallback((format: 'csv' | 'pdf') => {
    const csvContent = [
      ['Name', 'Attendance Rate', 'Present', 'Absent'],
      ...students.map(student => {
        const attendanceInRange = student.attendance.filter(record => {
          const recordDate = parseISO(record.date)
          return recordDate >= analyticsDateRange.from && recordDate <= analyticsDateRange.to
        })
        const counts = {
          present: attendanceInRange.filter(r => r.status === 'present').length,
          absent: attendanceInRange.filter(r => r.status === 'absent').length,
        }
        return [
          student.name,
          `${getAttendanceRate(student, analyticsDateRange.from, analyticsDateRange.to).toFixed(2)}%`,
          counts.present,
          counts.absent,
        ]
      })
    ].map(row => row.join(',')).join('\n')

    if (format === 'csv') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'attendance_report.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } else if (format === 'pdf') {
      console.log('Exporting as PDF:', csvContent)
      console.log('PDF export is not implemented in this demo.')
    }
  }, [students, getAttendanceRate, analyticsDateRange])

  const lowAttendanceStudents = useMemo(() => 
    students.filter(student => getAttendanceRate(student, analyticsDateRange.from, analyticsDateRange.to) < 70),
    [students, getAttendanceRate, analyticsDateRange]
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Attendance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={generateQRCode} variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                Generate QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Scan QR Code to Mark Attendance</DialogTitle>
                <DialogDescription>
                  Students can scan this QR code to mark their attendance for today.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center p-6">
                <QRCodeSVG value={qrCodeData} size={200} />
              </div>
            </DialogContent>
          </Dialog>
          <Select onValueChange={(value) => exportAttendance(value as 'csv' | 'pdf')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Export Report" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export as CSV</SelectItem>
              <SelectItem value="pdf">Export as PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentToday}</div>
            <p className="text-xs text-muted-foreground">
              Out of {totalStudents} students
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Attendance Rate</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyAttendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              For the current week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Trend</CardTitle>
            {attendanceTrend === 'up' && <BarChart className="h-4 w-4 text-green-500" />}
            {attendanceTrend === 'down' && <BarChart className="h-4 w-4 text-red-500" />}
            {attendanceTrend === 'stable' && <BarChart className="h-4 w-4 text-yellow-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{attendanceTrend}</div>
            <p className="text-xs text-muted-foreground">
              Compared to last week
            </p>
          </CardContent>
        </Card>
      </div>

      {lowAttendanceStudents.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Attendance Alert</AlertTitle>
          <AlertDescription>
            {lowAttendanceStudents.length} student(s) have attendance below 70%. Please check their profiles.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>Mark and view daily attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
                <div className="flex-1 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select value={filterOption} onValueChange={(value: 'all' | 'present' | 'absent') => setFilterOption(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedStudents.length === filteredStudents.length}
                          onCheckedChange={(checked) => {
                            setSelectedStudents(checked
                              ? filteredStudents.map(s => s.id)
                              : []
                            )
                          }}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => {
                              setSelectedStudents(prev =>
                                checked
                                  ? [...prev, student.id]
                                  : prev.filter(id => id !== student.id)
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-4" onClick={() => setSelectedStudent(student)}>
                            <Avatar>
                              <AvatarImage src={student.avatar} alt={student.name} />
                              <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AttendanceStatusBadge status={getAttendanceStatus(student, selectedDate || new Date())} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-secondary rounded-full h-2.5 mr-2">
                              <div
                                className="bg-primary h-2.5 rounded-full"
                                style={{ width: `${getAttendanceRate(student, analyticsDateRange.from, analyticsDateRange.to)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {getAttendanceRate(student, analyticsDateRange.from, analyticsDateRange.to).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => markAttendance(student.id, 'present')}
                              className={cn(
                                "hover:bg-green-100 hover:text-green-600",
                                getAttendanceStatus(student, selectedDate || new Date()) === 'present' && "bg-green-100 text-green-600"
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => markAttendance(student.id, 'absent')}
                              className={cn(
                                "hover:bg-red-100 hover:text-red-600",
                                getAttendanceStatus(student, selectedDate || new Date()) === 'absent' && "bg-red-100 text-red-600"
                              )}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {selectedStudent && (
            <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Student Profile</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} />
                      <AvatarFallback>{selectedStudent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Attendance Rate</h4>
                    <Progress value={getAttendanceRate(selectedStudent, analyticsDateRange.from, analyticsDateRange.to)} className="w-full" />
                    <p className="text-sm text-muted-foreground">{getAttendanceRate(selectedStudent, analyticsDateRange.from, analyticsDateRange.to).toFixed(1)}% attendance</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Attendance</h4>
                    <div className="flex gap-1">
                      {selectedStudent.attendance.slice(-7).map((record, index) => (
                        <div
                          key={index}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                            getStatusColor(record.status)
                          )}
                        >
                          {format(parseISO(record.date), 'd')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <UserCheck className="h-4 w-4" />
      case 'absent':
        return <UserX className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Badge variant="outline" className={cn(getStatusColor(status), "flex items-center gap-1")}>
      {getStatusIcon(status)}
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'present':
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case 'absent':
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}