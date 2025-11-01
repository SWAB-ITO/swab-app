'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Check, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { DataTableToolbar } from '@/components/composite/data-table-toolbar';
import { StatusBadge } from '@/components/composite/status-badge';
import { DataTablePagination } from '@/components/composite/data-table-pagination';
import { MentorDetailsDialog } from '@/components/features/mentors/mentor-details-dialog';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSection } from '@/components/layout/page-section';

interface Mentor {
  mn_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  preferred_name?: string;
  personal_email?: string;
  uga_email?: string;
  phone: string;
  status_category?: 'complete' | 'needs_fundraising' | 'needs_page' | 'needs_setup' | 'dropped';
  shift_preference?: string;
  partner_preference?: string;
  fundraising_page_url?: string;
  gb_contact_id?: string;
  amount_raised?: number;
  fundraised_at?: string;
  fundraising_done?: boolean;
  training_done?: boolean;
  training_at?: string;
  notes?: string;
  campaign_member?: boolean;
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<Partial<Mentor> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Mentor[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editableMentor, setEditableMentor] = useState<Partial<Mentor> | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const checkInSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      const response = await fetch('/api/mentors');
      if (response.ok) {
        const data = await response.json();
        setMentors(data.mentors || []);
      }
    } catch (error) {
      console.error('Error loading mentors:', error);
    } finally {
      setLoading(false);
    }
  };


  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (searchValue.length === 0) {
      setSearchResults([]);
      return;
    }

    // Debounce: wait 150ms after user stops typing
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mentors?phone=${searchValue}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.mentors || []);
        }
      } catch (error) {
        console.error('Error searching mentors:', error);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  const handleSearchInputChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSelectMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setNotes(mentor.notes || '');
    setEditableMentor(mentor);
    setDialogOpen(true);
    setSearchOpen(false);
    setSearchValue('');
    setSearchResults([]);
    setJustCheckedIn(false);
    setIsEditing(false);
  };

  const handleCheckIn = async (mnId: string) => {
    try {
      const response = await fetch('/api/mentors/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mn_id: mnId }),
      });
      if (!response.ok) throw new Error('Failed to check in');
      const result = await response.json();
      const updatedIndex = mentors.findIndex((m: Mentor) => m.mn_id === result.mentor.mn_id);
      if (updatedIndex > -1) {
          const newMentors = [...mentors];
          newMentors[updatedIndex] = result.mentor;
          setMentors(newMentors);
          setSelectedMentor(result.mentor);
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleUndoCheckIn = async (mnId: string) => {
    try {
      const response = await fetch('/api/mentors/checkin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mn_id: mnId }),
      });
      if (!response.ok) throw new Error('Failed to undo check in');
      const result = await response.json();
      const updatedIndex = mentors.findIndex((m: Mentor) => m.mn_id === result.mentor.mn_id);
      if (updatedIndex > -1) {
          const newMentors = [...mentors];
          newMentors[updatedIndex] = result.mentor;
          setMentors(newMentors);
          setSelectedMentor(result.mentor);
      }
    } catch (error) {
      console.error('Error undoing check in:', error);
    }
  };

  const handleNextMentor = () => {
    setDialogOpen(false);
    setSelectedMentor(null);
    setSearchValue('');
    setSearchResults([]);
    setSearchOpen(true);
    setFocusSearch(true);
  };

  useEffect(() => {
    if (focusSearch && searchOpen) {
      // Focus on check-in search after popover opens
      setTimeout(() => {
        const input = document.querySelector('[placeholder="Type last 4 digits of phone..."]') as HTMLInputElement;
        input?.focus();
        setFocusSearch(false);
      }, 100);
    }
  }, [focusSearch, searchOpen]);

  const handleViewDetails = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setNotes(mentor.notes || '');
    // Initialize editableMentor with a full copy, including new fields
    setEditableMentor({
      ...mentor,
      fundraising_done: !!mentor.fundraised_at,
    });
    setDialogOpen(true);
    setJustCheckedIn(false);
    setIsEditing(false);
  };

  const handleUpdateMentor = async (updatedMentor: Partial<Mentor>) => {
    if (!updatedMentor.mn_id) return;
    try {
      const response = await fetch(`/api/mentors/${updatedMentor.mn_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMentor),
      });

      if (!response.ok) {
        throw new Error('Failed to update mentor');
      }

      const result = await response.json();
      const updatedIndex = mentors.findIndex((m: Mentor) => m.mn_id === result.mentor.mn_id);
      if (updatedIndex > -1) {
        const newMentors = [...mentors];
        newMentors[updatedIndex] = result.mentor;
        setMentors(newMentors);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error updating mentor:', error);
    }
  };

  const handleExportGBImport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/mentors/gb-import');

      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to export GB import data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `givebutter-import-${new Date().toISOString().split('T')[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting GB import:', error);
      const message = error instanceof Error ? error.message : 'Failed to export Givebutter import file. Please try again.';
      alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Mentor>[] = [
    {
      accessorKey: 'mn_id',
      header: 'ID',
      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue('mn_id')}</div>,
    },
    {
      accessorKey: 'first_name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            First Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue('first_name')}</div>,
    },
    {
      accessorKey: 'last_name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue('last_name')}</div>,
    },
    {
      accessorKey: 'personal_email',
      header: 'Email',
      cell: ({ row }) => {
        const email = (row.getValue('personal_email') || row.original.uga_email) as string;
        return <div className="text-sm">{email}</div>;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return <div className="font-mono text-sm">{phone}</div>;
      },
    },
    {
      accessorKey: 'amount_raised',
      header: () => <div className="text-right">Raised</div>,
      cell: ({ row }) => {
        const amount = row.getValue('amount_raised') as number | null;
        const formatted = amount
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(amount)
          : '$0.00';
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: 'status_category',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status_category') as Mentor['status_category'];
        const statusMap: Record<NonNullable<Mentor['status_category']>, 'completed' | 'failed' | 'pending'> = {
          'complete': 'completed',
          'needs_fundraising': 'pending',
          'needs_page': 'pending',
          'needs_setup': 'pending',
          'dropped': 'failed'
        }
        const displayNames: Record<NonNullable<Mentor['status_category']>, string> = {
          'complete': 'Complete',
          'needs_fundraising': 'Needs Fundraising',
          'needs_page': 'Needs Page',
          'needs_setup': 'Needs Setup',
          'dropped': 'Dropped'
        }
        return (
          <div>
            <StatusBadge
              status={status ? statusMap[status] : 'pending'}
              label={status ? displayNames[status] : 'Unknown'}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const mentor = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewDetails(mentor)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(mentor.mn_id)}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: mentors,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const mentor = row.original as Mentor;

      // Search across name, email, and phone
      return (
        mentor.first_name?.toLowerCase().includes(searchValue) ||
        mentor.last_name?.toLowerCase().includes(searchValue) ||
        mentor.personal_email?.toLowerCase().includes(searchValue) ||
        mentor.uga_email?.toLowerCase().includes(searchValue) ||
        mentor.phone?.toLowerCase().includes(searchValue) ||
        false
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      selectMentor: (mentor: Mentor) => {
        setSelectedMentor(mentor);
        setDialogOpen(true);
      },
    },
  });

  return (
    <PageLayout
      badgeText="Mentor Management"
      title="Mentors"
      headerActions={
        <Button
          onClick={handleExportGBImport}
          disabled={isExporting}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export for Givebutter'}
        </Button>
      }
    >
      <PageSection
        className="animate-fade-in"
      >
        <div className="max-w-2xl mx-auto">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className="w-full justify-between h-14 text-base shadow-sm hover:shadow-md transition-all"
              >
                {searchValue || "Type phone number to check in..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[600px] p-0" align="center">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type last 4 digits of phone..."
                  value={searchValue}
                  onValueChange={handleSearchInputChange}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue.length > 0 ? 'No mentors found.' : 'Start typing to search...'}
                  </CommandEmpty>
                  {searchResults.length > 0 && (
                    <CommandGroup heading="Matching Mentors">
                      {searchResults.map((mentor) => (
                        <CommandItem
                          key={mentor.mn_id}
                          value={mentor.mn_id}
                          onSelect={() => handleSelectMentor(mentor)}
                          className="flex items-center justify-between py-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-medium">
                              {mentor.phone}
                            </span>
                            <span className="text-sm">—</span>
                            <span className="text-sm font-medium">
                              {mentor.first_name} {mentor.last_name}
                            </span>
                            {mentor.training_done && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                ✓ Checked In
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </PageSection>

      <PageSection
        title="Browse All Mentors"
      >
        <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
          <div className="p-4 border-b">
            <DataTableToolbar table={table} searchInputRef={searchInputRef} />
          </div>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading mentors...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewDetails(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No mentors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="py-4">
          <DataTablePagination table={table} />
        </div>
      </PageSection>

      <MentorDetailsDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        mentor={selectedMentor}
        onUpdate={handleUpdateMentor}
        onCheckIn={handleCheckIn}
        onUndoCheckIn={handleUndoCheckIn}
        onNext={handleNextMentor}
      />
    </PageLayout>
  );
}
