> This entire dir will soon be the entire detailed plan for this app & monorepo but for now, I am going to focus on building out the structure in the dir trees, using smart folder layounts to guide the rest of my thought capture. This will be deeply embedded with AI and as such, we need to aoid creating long and fanciful things that are difficult to edit and change when we change the scope. I want to prefer clear and established steps over dumped information and that needs to be noted throughout this entire process. We will be defining different app interfaces that will run for different purposes (8 total but more on that later...) with all of the features and the architecutre very clear and understandable. For basic and preliminary context, we are making a next.js app that will primarily be used for preparing complex synced info for mentors and mentees before our annual Event Day and during the day itself. It is made with nex.js and will have a supabase backend. I am planning to construct a monorepo were we can create different app interfaces that have different supabase auth channels depending on the type of access (some part of the web app are accessed by external people like mentors, some are accessed by volenteers, and some are accessed by exec and admins) and maybe are hosted differently on Vercel? (but one app would be preferrable with smaller apps housed inside the same instance) and maybe different on supabase (but hopefully the same on supabase as well just with many different tables). The reason I think the mini app idea can work is because the user loads will be largley distributed to different times that are consistent across years. There will never be crazy unplanned traffic (as long as we limit accordingly!)

## Tech Stack
- Next.JS
- Supabase
    - Auth
    - DB
    - Edge functions
    - etc
- Tailwind
- Shadcn
- ...