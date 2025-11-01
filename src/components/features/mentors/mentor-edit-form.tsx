'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// We'll need to define or import the Mentor type.
// For now, let's assume a basic structure.
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
    status_category?: 'complete' | 'needs_fundraising' | 'needs_page' | 'needs_setup' | 'dropped';
    training_done?: boolean;
    fundraising_done?: boolean;
}

interface MentorEditFormProps {
  mentor: Partial<Mentor>;
  onMentorChange: (updatedMentor: Partial<Mentor>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const MentorEditForm = ({ mentor, onMentorChange, onSave, isSaving }: MentorEditFormProps) => {
  return (
    <>
      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" value={mentor.first_name} onChange={(e) => onMentorChange({...mentor, first_name: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" value={mentor.last_name} onChange={(e) => onMentorChange({...mentor, last_name: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input id="middle_name" value={mentor.middle_name || ''} onChange={(e) => onMentorChange({...mentor, middle_name: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="preferred_name">Preferred Name</Label>
                    <Input id="preferred_name" value={mentor.preferred_name || ''} onChange={(e) => onMentorChange({...mentor, preferred_name: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="personal_email">Personal Email</Label>
                    <Input id="personal_email" value={mentor.personal_email || ''} onChange={(e) => onMentorChange({...mentor, personal_email: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="uga_email">UGA Email</Label>
                    <Input id="uga_email" value={mentor.uga_email || ''} onChange={(e) => onMentorChange({...mentor, uga_email: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={mentor.phone} onChange={(e) => onMentorChange({...mentor, phone: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Program Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2">
                    <Label htmlFor="shift_preference">Shift Preference</Label>
                    <Input id="shift_preference" value={mentor.shift_preference || ''} onChange={(e) => onMentorChange({...mentor, shift_preference: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partner_preference">Partner Preference</Label>
                    <Input id="partner_preference" value={mentor.partner_preference || ''} onChange={(e) => onMentorChange({...mentor, partner_preference: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={mentor.status_category} onValueChange={(value) => onMentorChange({...mentor, status_category: value as Mentor['status_category']})}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="needs_fundraising">Needs Fundraising</SelectItem>
                        <SelectItem value="needs_page">Needs Page</SelectItem>
                        <SelectItem value="needs_setup">Needs Setup</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox id="training_done" checked={mentor.training_done} onCheckedChange={(checked) => onMentorChange({...mentor, training_done: !!checked})} />
                    <label htmlFor="training_done" className="text-sm font-medium leading-none self-end">Training Done</label>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Fundraising</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="amount_raised">Amount Raised</Label>
                    <Input id="amount_raised" type="number" value={mentor.amount_raised || 0} onChange={(e) => onMentorChange({...mentor, amount_raised: parseFloat(e.target.value)})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="fundraising_page_url">Fundraising Page URL</Label>
                    <Input id="fundraising_page_url" value={mentor.fundraising_page_url || ''} onChange={(e) => onMentorChange({...mentor, fundraising_page_url: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox id="fundraising_done" checked={mentor.fundraising_done} onCheckedChange={(checked) => onMentorChange({...mentor, fundraising_done: !!checked})} />
                    <label htmlFor="fundraising_done" className="text-sm font-medium leading-none self-end">Fundraising Done</label>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-2">
            <Label htmlFor="notes-edit">Notes</Label>
            <Textarea id="notes-edit" value={mentor.notes || ''} onChange={(e) => onMentorChange({...mentor, notes: e.target.value})} className="border-green-200/50 focus:border-green-400 focus:ring-green-400" />
        </div>
      </div>
      <div className="flex justify-end pt-6 border-t px-6">
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save All Changes'}</Button>
      </div>
    </>
  );
};
