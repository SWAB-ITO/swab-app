'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/composite/status-badge';
import { MentorFundraisingCard } from './mentor-fundraising-card';

interface Mentor {
  mn_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  checked_in_at?: string;
  training_at?: string;
  amount_raised?: number;
  fundraising_page_url?: string;
  notes?: string;
}

interface MentorCheckinPanelProps {
  mentor: Mentor;
  notes: string;
  onNotesChange: (notes: string) => void;
  onCheckIn: (mnId: string) => void;
  onUndoCheckIn: (mnId: string) => void;
  isSaving: boolean;
  justCheckedIn: boolean;
  onNext: () => void;
}

export const MentorCheckinPanel = ({
  mentor,
  notes,
  onNotesChange,
  onCheckIn,
  onUndoCheckIn,
  isSaving,
  justCheckedIn,
  onNext,
}: MentorCheckinPanelProps) => {
  return (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{mentor.first_name} {mentor.last_name}</h2>
            <p className="text-muted-foreground">{mentor.phone}</p>
          </div>
          <div className="flex justify-between items-center rounded-lg p-3 bg-muted/40 border">
            <span className="text-sm font-medium">Training Status</span>
            <StatusBadge status={mentor.training_at ? 'completed' : 'pending'}>
              {mentor.training_at ? 'Completed' : 'Pending'}
            </StatusBadge>
          </div>
          {justCheckedIn ? (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => onUndoCheckIn(mentor.mn_id)} disabled={isSaving} className="w-2/3 h-12 text-base rounded-full">
                {isSaving ? 'Saving...' : 'Undo Check-In'}
              </Button>
              <Button onClick={onNext} className="w-1/3 h-12 text-base rounded-full">Find Next</Button>
            </div>
          ) : mentor.training_at ? (
            <Button variant="destructive" onClick={() => onUndoCheckIn(mentor.mn_id)} disabled={isSaving} className="w-full h-12 text-base rounded-full">
              {isSaving ? 'Saving...' : 'Undo Training Check-In'}
            </Button>
          ) : (
            <Button onClick={() => onCheckIn(mentor.mn_id)} disabled={isSaving} className="w-full h-12 text-base rounded-full">
              {isSaving ? 'Saving...' : 'Check In to Training'}
            </Button>
          )}
        </CardContent>
      </Card>

      <MentorFundraisingCard
        amountRaised={mentor.amount_raised || 0}
        fundraisingPageUrl={mentor.fundraising_page_url}
      />

      <div className="space-y-2">
        <Label htmlFor="notes-checkin">Notes</Label>
        <Textarea
          id="notes-checkin"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Use the 'Edit Details' tab to save notes."
          className="border-green-200/50 focus:border-green-400 focus:ring-green-400"
        />
      </div>
    </div>
  );
};
