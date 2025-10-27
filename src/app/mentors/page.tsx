'use client';

import { useState, useEffect } from 'react';
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
import { ArrowUpDown, MoreHorizontal, Search, Check, ChevronsUpDown } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';

interface Mentor {
  mn_id: string;
  first_name: string;
  last_name: string;
  personal_email?: string;
  uga_email?: string;
  phone: string;
  status_category?: string;
  fundraising_page_url?: string;
  gb_contact_id?: string;
  amount_raised?: number;
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
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Mentor[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [notes, setNotes] = useState('');

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
    setDialogOpen(true);
    setSearchOpen(false);
    setSearchValue('');
    setSearchResults([]);
    setJustCheckedIn(false);
  };

  const handleCheckIn = async () => {
    if (!selectedMentor) return;

    setCheckingIn(true);
    try {
      const response = await fetch('/api/mentors/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mn_id: selectedMentor.mn_id,
          notes: notes.trim() || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMentor(data.mentor);
        setJustCheckedIn(true);
        // Refresh the mentor list to show updated status
        loadMentors();
      }
    } catch (error) {
      console.error('Error checking in mentor:', error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!selectedMentor) return;

    setCheckingIn(true);
    try {
      const response = await fetch('/api/mentors/checkin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mn_id: selectedMentor.mn_id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMentor(data.mentor);
        // Refresh the mentor list to show updated status
        loadMentors();
      }
    } catch (error) {
      console.error('Error undoing check-in:', error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleNextPerson = () => {
    setDialogOpen(false);
    setSelectedMentor(null);
    setJustCheckedIn(false);
    setNotes('');
    setSearchValue('');
    setSearchOpen(true);
  };

  const handleViewDetails = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setDialogOpen(true);
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
      header: () => <div className="text-right">Amount Raised</div>,
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
        const status = row.getValue('status_category') as string;
        return (
          <div className="capitalize">
            <span className="px-2 py-1 rounded-full text-xs bg-muted">{status || 'active'}</span>
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              Mentor Management
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Mentors
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
            Search, view, and manage mentor information
          </p>
        </div>

        {/* Quick Search Section - Centered */}
        <section className="mb-14 animate-fade-in">
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
                  <Search className="ml-2 h-5 w-5 shrink-0 opacity-50" />
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
                            <Check className="h-4 w-4 opacity-0" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Browse All Section */}
        <section className="mb-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              Browse All Mentors
            </h2>
            <p className="text-muted-foreground text-base ml-7">View and manage all mentor records</p>
          </div>
        </section>

        {/* Table Section */}
        <section>
          <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
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

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-muted-foreground text-sm">
              Showing {table.getRowModel().rows.length} of {mentors.length} mentor(s)
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        {/* Training Check-In Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedMentor && (
              <>
                {!justCheckedIn ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Training Check-In</DialogTitle>
                      <DialogDescription>
                        Confirm attendance for mentor training
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      {/* Mentor Info - Big and Clear */}
                      <div className="text-center space-y-2 p-6 bg-muted/50 rounded-lg">
                        <h2 className="text-3xl font-bold">
                          {selectedMentor.first_name} {selectedMentor.last_name}
                        </h2>
                        <p className="text-xl font-mono text-muted-foreground">
                          {selectedMentor.phone}
                        </p>
                      </div>

                      {/* Fundraising Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-card">
                          <Label className="text-xs text-muted-foreground">Fundraising Page</Label>
                          <div className="mt-1">
                            {selectedMentor.campaign_member ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">✓</span>
                                <span className="text-sm font-medium">Active</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not Set Up</span>
                            )}
                          </div>
                          {selectedMentor.fundraising_page_url && (
                            <a
                              href={selectedMentor.fundraising_page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-2 block truncate"
                            >
                              View Page
                            </a>
                          )}
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                          <Label className="text-xs text-muted-foreground">Amount Raised</Label>
                          <p className="text-2xl font-bold mt-1">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            }).format(selectedMentor.amount_raised || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Training Check-In Status */}
                      {selectedMentor.training_done ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-green-900">Already Checked In</p>
                              <p className="text-sm text-green-700">
                                {selectedMentor.training_at &&
                                  new Date(selectedMentor.training_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-amber-600 text-xl">⏱</span>
                            </div>
                            <div>
                              <p className="font-semibold text-amber-900">Not Checked In</p>
                              <p className="text-sm text-amber-700">
                                Click below to mark attendance
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes Section */}
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-base">
                          Notes {!selectedMentor.training_done && '(Optional)'}
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any notes about this check-in (e.g., questions asked, special circumstances, etc.)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-[100px] resize-none"
                          disabled={selectedMentor.training_done}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        {!selectedMentor.training_done ? (
                          <Button
                            onClick={handleCheckIn}
                            disabled={checkingIn}
                            className="w-full h-14 text-lg font-semibold"
                            size="lg"
                          >
                            {checkingIn ? 'Checking In...' : 'Check In to Training'}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleUndoCheckIn}
                            disabled={checkingIn}
                            variant="destructive"
                            className="w-full h-12 text-base"
                            size="lg"
                          >
                            {checkingIn ? 'Undoing Check-In...' : 'Undo Check-In'}
                          </Button>
                        )}
                        <Button
                          onClick={() => setDialogOpen(false)}
                          variant="outline"
                          className="w-full"
                        >
                          {selectedMentor.training_done ? 'Close' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Success State */}
                    <div className="py-8 text-center space-y-6">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-10 w-10 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-green-900 mb-2">
                          Check-In Complete!
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {selectedMentor.first_name} {selectedMentor.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          has been marked as attending training
                        </p>
                      </div>
                      <div className="space-y-2 pt-4">
                        <Button
                          onClick={handleNextPerson}
                          className="w-full h-12 text-base"
                          size="lg"
                        >
                          Next Person
                        </Button>
                        <Button
                          onClick={() => setDialogOpen(false)}
                          variant="outline"
                          className="w-full"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
