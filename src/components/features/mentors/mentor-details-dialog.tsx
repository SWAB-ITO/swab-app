'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MentorEditForm } from './mentor-edit-form';
import { MentorCheckinPanel } from './mentor-checkin-panel';
import { PersonStanding } from 'lucide-react';

interface Mentor {
  mn_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  preferred_name?: string;
  phone: string;
  personal_email?: string;
  uga_email?: string;
  checked_in_at?: string;
  training_at?: string;
  fundraised_at?: string;
  shift_preference?: string;
  partner_preference?: string;
  amount_raised?: number;
  fundraising_page_url?: string;
  notes?: string;
  status_category: 'active' | 'limbo' | 'dropped';
  training_done?: boolean;
  fundraising_done?: boolean;
}

interface MentorDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mentor: Partial<Mentor> | null;
  onUpdate: (updatedMentor: Partial<Mentor>) => Promise<void>;
  onCheckIn: (mnId: string) => Promise<void>;
  onUndoCheckIn: (mnId: string) => Promise<void>;
  onNext: () => void;
}

export const MentorDetailsDialog = ({
  isOpen,
  onOpenChange,
  mentor,
  onUpdate,
  onCheckIn,
  onUndoCheckIn,
  onNext,
}: MentorDetailsDialogProps) => {
  const [editableMentor, setEditableMentor] = useState<Partial<Mentor> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const prevMentorIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (mentor) {
      if (prevMentorIdRef.current !== mentor.mn_id) {
        setJustCheckedIn(false);
      }
      const isFundraisingDone = mentor.fundraised_at ? new Date(mentor.fundraised_at) > new Date(0) : false;
      setEditableMentor({ ...mentor, fundraising_done: isFundraisingDone });
    } else {
      setEditableMentor(null);
    }
    prevMentorIdRef.current = mentor?.mn_id;
  }, [mentor]);

  if (!mentor || !editableMentor) {
    return null;
  }

  const handleUpdateMentor = async () => {
    if (!editableMentor) return;
    setIsSaving(true);
    await onUpdate(editableMentor);
    setIsSaving(false);
  };
  
  const handleCheckIn = async (mnId: string) => {
    setIsSaving(true);
    await onCheckIn(mnId);
    setIsSaving(false);
    setJustCheckedIn(true);
  };

  const handleUndoCheckIn = async (mnId: string) => {
    setIsSaving(true);
    await onUndoCheckIn(mnId);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PersonStanding />
            Mentor Details
          </DialogTitle>
          <DialogDescription>
            Manage training check-in and edit details for {mentor.preferred_name || mentor.first_name} {mentor.last_name}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="checkin">
          <TabsList>
            <TabsTrigger value="checkin">Training Check-In</TabsTrigger>
            <TabsTrigger value="edit">Edit Details</TabsTrigger>
          </TabsList>
          <TabsContent value="checkin">
            <MentorCheckinPanel
              mentor={mentor as Mentor}
              notes={editableMentor.notes || ''}
              onNotesChange={(notes) => setEditableMentor({ ...editableMentor, notes })}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
              isSaving={isSaving}
              justCheckedIn={justCheckedIn}
              onNext={onNext}
            />
          </TabsContent>
          <TabsContent value="edit">
            <MentorEditForm
              mentor={editableMentor}
              onMentorChange={setEditableMentor}
              onSave={handleUpdateMentor}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
