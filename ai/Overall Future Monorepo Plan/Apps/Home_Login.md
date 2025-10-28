> This is the main page of the app which will allow users to login via magic link (or by email/password if they are exec) which will then bring users to a display where they will be shown a modal of the swab apps they have access to.
For example:
- Internal Login (A person working check in or check out) would show...
    - mentor check in, mentee check in, matching, checkpoint, and check out
- Exec Login would show...
    - all in internal login + any admin or config dashboards behind certian apps. The exec view might need to be grouped by relevance (meaning that the event day stuff is grouped and the pre event day stuff is grouped)
- Mentors would login with their personal email via magic link and will have a simple modal where they can view their partener, their fundraising status, their shift, etc and change any of it

I am not sure if it is best to make these all one auth flow with complex logic or potentially setup 2 seperatley hosted apps with different auth backends (one being the mentor database, the other being event day). I want to look into it but regardless I want it to be a narrow opening with a wide and configurable access. Given it is vercel and we shouldnt have any unplanned loads (esp given auth) we should be good! Thoughts?