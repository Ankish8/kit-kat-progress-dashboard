'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { KeyboardEventHandler } from 'react';
import { Search, Candy, Flame, ChevronUp, ChevronDown, Filter, Crown, IceCream, Cookie, Cake, Calendar, Hash, User, Star, Zap, HelpCircle, X, Loader2, Skull, RotateCcw, Sun, Moon } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Student {
  id: number
  name: string
  kitKatPoints: number
  xp: number
  streak: number
  lastAttendance: Date | null
  avatar: string
  previousRank?: number
}

const MAX_MULTIPLIER = 5
const TOP_STUDENTS_COUNT = 3
const XP_PER_KIT_KAT = 100

const calculateMultiplier = (streak: number) => streak === 0 ? 1 : Math.min(1 + streak * 0.1, MAX_MULTIPLIER)

type SortField = 'name' | 'kitKatPoints' | 'streak' | 'multiplier' | 'xp'
type SortOrder = 'asc' | 'desc'

const getKitKatPointColor = (points: number, isDarkMode: boolean) => {
  if (points < 1) return isDarkMode ? 'text-gray-300' : 'text-gray-800'
  if (points < 3) return isDarkMode ? 'text-blue-300' : 'text-blue-800'
  if (points < 5) return isDarkMode ? 'text-green-300' : 'text-green-800'
  if (points < 10) return isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
  return isDarkMode ? 'text-red-300' : 'text-red-800'
}

const getCandyIcon = (points: number) => {
  if (points < 1) return <Candy className="h-4 w-4 text-gray-400" />
  if (points < 3) return <IceCream className="h-4 w-4 text-blue-500" />
  if (points < 5) return <Cookie className="h-4 w-4 text-green-500" />
  if (points < 10) return <Cake className="h-4 w-4 text-yellow-500" />
  return <Candy className="h-4 w-4 text-red-500" />
}

const StudentTable: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: "Alice Johnson", kitKatPoints: 0, xp: 0, streak: 0, lastAttendance: null, avatar: "/placeholder.svg?height=40&width=40" },
    { id: 2, name: "Bob Smith", kitKatPoints: 0, xp: 0, streak: 0, lastAttendance: null, avatar: "/placeholder.svg?height=40&width=40" },
    { id: 3, name: "Charlie Davis", kitKatPoints: 0, xp: 0, streak: 0, lastAttendance: null, avatar: "/placeholder.svg?height=40&width=40" },
    { id: 4, name: "Diana Evans", kitKatPoints: 0, xp: 0, streak: 0, lastAttendance: null, avatar: "/placeholder.svg?height=40&width=40" },
    { id: 5, name: "Ethan Foster", kitKatPoints: 0, xp: 0, streak: 0, lastAttendance: null, avatar: "/placeholder.svg?height=40&width=40" }
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAnimation, setShowAnimation] = useState<{ id: number, change: number } | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({ field: 'xp', order: 'desc' })
  const [filterConfig, setFilterConfig] = useState({ minKitKatPoints: 0, minStreak: 0, minXP: 0 })
  const [isAnimating, setIsAnimating] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [focusedStudentIndex, setFocusedStudentIndex] = useState(-1)
  const [isMac, setIsMac] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<Student[][]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredStudents = useMemo(() => {
    return students
      .filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        student.kitKatPoints >= filterConfig.minKitKatPoints &&
        student.streak >= filterConfig.minStreak &&
        student.xp >= filterConfig.minXP
      )
      .sort((a, b) => {
        const { field, order } = sortConfig
        let comparison = 0
        if (field === 'name') {
          comparison = a.name.localeCompare(b.name)
        } else if (field === 'kitKatPoints') {
          comparison = a.kitKatPoints - b.kitKatPoints
        } else if (field === 'streak') {
          comparison = a.streak - b.streak
        } else if (field === 'multiplier') {
          comparison = calculateMultiplier(a.streak) - calculateMultiplier(b.streak)
        } else if (field === 'xp') {
          comparison = a.xp - b.xp
        }
        return order === 'asc' ? comparison : -comparison
      })
  }, [students, searchTerm, sortConfig, filterConfig])

  const topStudents = useMemo(() => {
    return [...students].sort((a, b) => b.xp - a.xp).slice(0, TOP_STUDENTS_COUNT)
  }, [students])

  const handleKitKatChange = useCallback((studentIds: number[], change: number) => {
    setUndoStack(prev => [...prev, students])
    setStudents(prevStudents =>
      prevStudents.map(student => {
        if (studentIds.includes(student.id)) {
          const newKitKatPoints = Math.max(0, student.kitKatPoints + change)
          const newXP = Math.round(student.xp + (change * XP_PER_KIT_KAT * calculateMultiplier(student.streak)))
          return { ...student, kitKatPoints: newKitKatPoints, xp: Math.max(0, newXP) }
        }
        return student
      })
    )
    studentIds.forEach(id => {
      setShowAnimation({ id, change })
      setTimeout(() => setShowAnimation(null), 300)
    })
  }, [students])

  const handleAttendance = useCallback((studentIds: number[]) => {
    setUndoStack(prev => [...prev, students])
    const today = new Date()
    setStudents(prevStudents =>
      prevStudents.map(student => {
        if (studentIds.includes(student.id)) {
          const isConsecutive = student.lastAttendance &&
            (today.getTime() - student.lastAttendance.getTime()) / (1000 * 3600 * 24) <= 1
          return {
            ...student,
            streak: isConsecutive ? student.streak + 1 : 1,
            lastAttendance: today
          }
        }
        return student
      })
    )
  }, [students])

  const resetStreak = useCallback((studentIds: number[]) => {
    setUndoStack(prev => [...prev, students])
    setStudents(prevStudents =>
      prevStudents.map(student =>
        studentIds.includes(student.id) ? { ...student, streak: 0, lastAttendance: null } : student
      )
    )
  }, [students])

  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1]
      setStudents(prevState)
      setUndoStack(prev => prev.slice(0, -1))
      console.log("Action Undone: The last action has been undone.")
    } else {
      console.log("No Actions to Undo: There are no more actions to undo.")
    }
  }, [undoStack])

  const toggleSelectAll = useCallback(() => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }, [selectedStudents, filteredStudents])

  const toggleSelectStudent = useCallback((studentId: number) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
    setIsAnimating(true)
  }, [])

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAnimating])

  useEffect(() => {
    setStudents(prevStudents =>
      prevStudents.map((student, index) => ({
        ...student,
        previousRank: index
      }))
    )
  }, [sortConfig])

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  const handleKeyAction = useCallback((key: string) => {
    if (isNavigating && focusedStudentIndex !== -1) {
      if (key === 'k') {
        handleKitKatChange([filteredStudents[focusedStudentIndex].id], 1)
      } else if (key === 'a') {
        handleAttendance([filteredStudents[focusedStudentIndex].id])
      } else if (key === 'r') {
        resetStreak([filteredStudents[focusedStudentIndex].id])
      }
    } else {
      if (key === 'k') {
        handleKitKatChange(filteredStudents.map(s => s.id), 1)
      } else if (key === 'a') {
        handleAttendance(filteredStudents.map(s => s.id))
      } else if (key === 'r') {
        resetStreak(filteredStudents.map(s => s.id))
      }
    }
  }, [focusedStudentIndex, filteredStudents, handleKitKatChange, handleAttendance, resetStreak, isNavigating])
  
  const handleKeyDownReact: KeyboardEventHandler<HTMLDivElement> = useCallback((e) => {
    const modifierKey = isMac ? e.metaKey : e.ctrlKey
    
    if (modifierKey && e.key === '/') {
      e.preventDefault()
      setShowShortcuts(prev => !prev)
    } else if (modifierKey && e.key === 'f') {
      e.preventDefault()
      searchInputRef.current?.focus()
    } else if (modifierKey && e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedStudentIndex(prev => Math.min(prev + 1, filteredStudents.length - 1))
      setIsNavigating(true)
    } else if (modifierKey && e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedStudentIndex(prev => Math.max(prev - 1, -1))
      setIsNavigating(true)
    } else if (modifierKey && e.key === 'Enter') {
      e.preventDefault()
      if (focusedStudentIndex !== -1) {
        toggleSelectStudent(filteredStudents[focusedStudentIndex].id)
      }
    } else if (modifierKey && e.key === 'k') {
      e.preventDefault()
      handleKeyAction('k')
    } else if (modifierKey && e.key === 'a') {
      e.preventDefault()
      handleKeyAction('a')
    } else if (modifierKey && e.key === 'r') {
      e.preventDefault()
      handleKeyAction('r')
    } else if (modifierKey && e.key === 'z') {
      e.preventDefault()
      undo()
    }
  }, [focusedStudentIndex, filteredStudents, toggleSelectStudent, handleAttendance, handleKitKatChange, resetStreak, isMac, isNavigating, undo, handleKeyAction])
  
  const handleKeyDownDocument = useCallback((e: KeyboardEvent) => {
    const modifierKey = isMac ? e.metaKey : e.ctrlKey
    
    if (modifierKey && e.key === '/') {
      e.preventDefault()
      setShowShortcuts(prev => !prev)
    } else if (modifierKey && e.key === 'f') {
      e.preventDefault()
      searchInputRef.current?.focus()
    } else if (modifierKey && e.key === 'k') {
      e.preventDefault()
      handleKeyAction('k')
    } else if (modifierKey && e.key === 'a') {
      e.preventDefault()
      handleKeyAction('a')
    } else if (modifierKey && e.key === 'r') {
      e.preventDefault()
      handleKeyAction('r')
    } else if (modifierKey && e.key === 'z') {
      e.preventDefault()
      undo()
    }
  }, [isMac, handleKeyAction, undo])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownDocument)
    return () => {
      document.removeEventListener('keydown', handleKeyDownDocument)
    }
  }, [handleKeyDownDocument])

  useEffect(() => {
    if (searchTerm) {
      setIsNavigating(false)
      setFocusedStudentIndex(-1)
    }
  }, [searchTerm])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`p-4 overflow-x-auto ${isDarkMode ? 'dark' : ''}`} tabIndex={0} onKeyDown={handleKeyDownReact}>
      <style jsx global>{`
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96.1%;
          --muted-foreground: 215.4 16.3% 46.9%;
          --popover: 0 0% 100%;
          
          --popover-foreground: 222.2 47.4% 11.2%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --card: 0 0% 100%;
          --card-foreground: 222.2 47.4% 11.2%;
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96.1%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --destructive: 0 100% 50%;
          --destructive-foreground: 210 40% 98%;
          --ring: 215 20.2% 65.1%;
          --radius: 0.5rem;
        }

        .dark {
          --background: 224 71% 4%;
          --foreground: 213 31% 91%;
          --muted: 223 47% 11%;
          --muted-foreground: 215.4 16.3% 56.9%;
          --accent: 216 34% 17%;
          --accent-foreground: 210 40% 98%;
          --popover: 224 71% 4%;
          --popover-foreground: 215 20.2% 65.1%;
          --border: 216 34% 17%;
          --input: 216 34% 17%;
          --card: 224 71% 4%;
          --card-foreground: 213 31% 91%;
          --primary: 210 40% 98%;
          --primary-foreground: 222.2 47.4% 1.2%;
          --secondary: 222.2 47.4% 11.2%;
          --secondary-foreground: 210 40% 98%;
          --destructive: 0 63% 31%;
          --destructive-foreground: 210 40% 98%;
          --ring: 216 34% 17%;
          --radius: 0.5rem;
        }
      `}</style>
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-10 w-10 text-yellow-300" />
            <h1 className="text-3xl font-bold">Progress Dashboard</h1>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex-1 md:w-96">
                    <Input
                      ref={searchInputRef}
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10 bg-white/20 text-white placeholder:text-white/80 border-white/30 focus:bg-white/30 focus:placeholder:text-white/60"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Press {isMac ? 'Cmd' : 'Ctrl'} + F to focus
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h3 className="font-medium">Filters</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Kit Kat Points</label>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[filterConfig.minKitKatPoints]}
                      onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minKitKatPoints: value[0] }))}
                    />
                    <div className="text-sm text-gray-500 dark:text-gray-400">{filterConfig.minKitKatPoints}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Streak</label>
                    <Slider
                      min={0}
                      max={30}
                      step={1}
                      value={[filterConfig.minStreak]}
                      onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minStreak: value[0] }))}
                    />
                    <div className="text-sm text-gray-500 dark:text-gray-400">{filterConfig.minStreak}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min XP</label>
                    <Slider
                      min={0}
                      max={1000}
                      step={50}
                      value={[filterConfig.minXP]}
                      onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minXP: value[0] }))}
                    />
                    <div className="text-sm text-gray-500 dark:text-gray-400">{filterConfig.minXP}</div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setShowShortcuts(true)}>
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Show Keyboard Shortcuts ({isMac ? 'Cmd' : 'Ctrl'} + /)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {selectedStudents.length > 0 && (
        <div className="mb-4 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setBulkActionLoading('add')
                    handleKitKatChange(selectedStudents, 1)
                    setTimeout(() => {
                      setBulkActionLoading(null)
                      console.log("Kit Kat Points Added: Added 1 Kit Kat point to " + selectedStudents.length + " student(s)")
                    }, 500)
                  }}
                  disabled={bulkActionLoading !== null}
                  className="w-40"
                >
                  {bulkActionLoading === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Kit Kat Point
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMac ? 'Cmd' : 'Ctrl'} + k
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setBulkActionLoading('remove')
                    handleKitKatChange(selectedStudents, -1)
                    setTimeout(() => {
                      setBulkActionLoading(null)
                      console.log("Kit Kat Points Removed: Removed 1 Kit Kat point from " + selectedStudents.length + " student(s)")
                    }, 500)
                  }}
                  variant="outline"
                  disabled={bulkActionLoading !== null}
                  className="w-40"
                >
                  {bulkActionLoading === 'remove' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Remove Kit Kat Point
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Long press on Add Kit Kat Point button
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setBulkActionLoading('attendance')
                    handleAttendance(selectedStudents)
                    setTimeout(() => {
                      setBulkActionLoading(null)
                      console.log("Attendance Marked: Marked attendance for " + selectedStudents.length + " student(s)")
                    }, 500)
                  }}
                  disabled={bulkActionLoading !== null}
                  className="w-40"
                >
                  {bulkActionLoading === 'attendance' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Mark Attendance
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMac ? 'Cmd' : 'Ctrl'} + a
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={bulkActionLoading !== null}
                      className="w-40"
                    >
                      Reset Streak
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMac ? 'Cmd' : 'Ctrl'} + r
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently reset the streak for {selectedStudents.length} student(s).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setBulkActionLoading('reset')
                    resetStreak(selectedStudents)
                    setTimeout(() => {
                      setBulkActionLoading(null)
                      console.log("Streaks Reset: Reset streaks for " + selectedStudents.length + " student(s)")
                    }, 500)
                  }}
                >
                  {bulkActionLoading === 'reset' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reset Streak
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedStudents.length === filteredStudents.length}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[50px]">
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                <span>Rank</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Name</span>
                {sortConfig.field === 'name' && (sortConfig.order === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </div>
            </TableHead>
            <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('kitKatPoints')}>
              <div className="flex items-center gap-1">
                <Candy className="h-4 w-4" />
                <span>Kit Kat Points</span>
                {sortConfig.field === 'kitKatPoints' && (sortConfig.order === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </div>
            </TableHead>
            <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('streak')}>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Attendance</span>
                {sortConfig.field === 'streak' && (sortConfig.order === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </div>
            </TableHead>
            <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('multiplier')}>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>Multiplier</span>
                {sortConfig.field === 'multiplier' && (sortConfig.order === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </div>
            </TableHead>
            <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('xp')}>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span>XP</span>
                {sortConfig.field === 'xp' && (sortConfig.order === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {filteredStudents.map((student, index) => (
              <motion.tr
                key={student.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className={`${topStudents.includes(student) ? 'bg-amber-50 dark:bg-amber-900/30' : ''} ${index === focusedStudentIndex ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => toggleSelectStudent(student.id)}
                  />
                </TableCell>
                <TableCell>
                  {index + 1}
                  {isAnimating && student.previousRank !== undefined && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`ml-2 ${index < student.previousRank ? 'text-green-500' : index > student.previousRank ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      {index < student.previousRank ? '↑' : index > student.previousRank ? '↓' : '-'}
                      {index !== student.previousRank && Math.abs(index - student.previousRank)}
                    </motion.span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{student.name}</span>
                    {topStudents.indexOf(student) !== -1 && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className={`flex items-center gap-1 px-2 py-1 h-auto ${getKitKatPointColor(student.kitKatPoints, isDarkMode)}`}
                        onClick={() => handleKitKatChange([student.id], 1)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleKitKatChange([student.id], -1)
                        }}
                      >
                        {student.kitKatPoints} {getCandyIcon(student.kitKatPoints)}
                      </Button>
                      <AnimatePresence>
                        {showAnimation?.id === student.id && (
                          <motion.span
                            key={`animation-${student.id}-${showAnimation.change}`}
                            initial={{ opacity: 0, scale: 0.5, y: showAnimation.change > 0 ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: showAnimation.change > 0 ? -10 : 10 }}
                            exit={{ opacity: 0, scale: 0.5, y: showAnimation.change > 0 ? -20 : 20 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className={`absolute top-0 right-0 transform translate-x-1/2 -translate-y-full font-bold text-lg ${showAnimation.change > 0 ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {showAnimation.change > 0 ? '+1' : '-1'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 group">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onTap={() => handleAttendance([student.id])}
                          >
                            <Badge
                              variant="outline"
                              className="cursor-pointer select-none"
                            >
                              {student.streak} day{student.streak !== 1 ? 's' : ''}
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              >
                                <Flame className="h-4 w-4 inline ml-1 text-orange-500" />
                              </motion.div>
                            </Badge>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {student.streak} day{student.streak !== 1 ? 's' : ''} attendance streak
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <motion.div
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Skull className="h-4 w-4 text-red-500 cursor-pointer" />
                              </motion.div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Attendance Streak</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reset the attendance streak for {student.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resetStreak([student.id])}>
                                  Reset Streak
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent>Reset attendance streak</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`cursor-pointer ${getMultiplierColor(calculateMultiplier(student.streak))}`}
                          onClick={() => {
                            console.log("Multiplier Breakdown: Base: 1x\nStreak Bonus: +" + (calculateMultiplier(student.streak) - 1).toFixed(1) + "x\nTotal: " + calculateMultiplier(student.streak).toFixed(1) + "x")
                          }}
                        >
                          {calculateMultiplier(student.streak).toFixed(1)}x
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Click for multiplier breakdown
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {student.xp} XP
                  </Badge>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + /</kbd> Show/Hide Shortcuts</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + F</kbd> Focus Search</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + ↑</kbd> / <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + ↓</kbd> Navigate Students</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + Enter</kbd> Select/Deselect Student</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + a</kbd> Mark Attendance</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + k</kbd> Add Kit Kat Point</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + r</kbd> Reset Streak</li>
              <li><kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isMac ? 'Cmd' : 'Ctrl'} + z</kbd> Undo Last Action</li>
            </ul>
          </div>
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Undo Last Action ({isMac ? 'Cmd' : 'Ctrl'} + z)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

const getMultiplierColor = (multiplier: number) => {
  if (multiplier < 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (multiplier < 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (multiplier < 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

const KitKatStudentTable = StudentTable
export default KitKatStudentTable