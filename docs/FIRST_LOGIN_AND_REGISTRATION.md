# First login & registration

What happens when a **new member** logs in for the first time (e.g. with the temporary password from the welcome email) and how **registration completion** gates access to the full dashboard. It’s the step right after “Adding a new member”: the member now has an Auth account and a `members` row with `registration_complete = false`; this flow gets them to `registration_complete = true` and into the main dashboard.  
---

## 1\. Logging in

**What happens:** The new member goes to the **login page** (`login.html`), enters the email they were given (often their @spanationwide.org address) and the **temporary password** from the welcome email. If they type only the local part (e.g. `firstname.lastname`), the app can auto-append `@spanationwide.org`. On success, they are redirected to **`/dashboard.html`**.

If they arrived via a **password reset link** (e.g. from the Edge Function recovery flow), the URL may contain a hash; the login page handles that and can show a “set new password” form or redirect to dashboard once the session is established. For a brand‑new member using the temp password, the normal path is email \+ password → redirect to dashboard.

**Where it lives:**

- **Page:** **`src/pages/LoginPage.jsx`**. It uses `supabase.auth.signInWithPassword({ email, password })`. On success it sets `window.location.href = '/dashboard.html'`. If the user already has a session when the page loads (e.g. they’re already logged in), it redirects to the dashboard immediately so they can’t “get stuck” on the login page.

**Note:** Login does not read `registration_complete`; `DashboardPage` branches on that flag after loading the member row.  
---

## 2\. Dashboard: registration gate

**What happens:** When the user lands on **`dashboard.html`**, the **Dashboard** app loads and runs **`loadMemberData`**. That gets the current session (`supabase.auth.getSession()`). If there’s no session, the user is redirected to **`/login.html`**. If there is a session, the app looks up the **member** row (by `user_id` from the session, or by email as fallback) from the **`members`** table. If no member is found, the user stays on the dashboard but with no member data (error/empty state). If a member is found, that member object is stored in state.

Then the dashboard decides what to render:

- If **`member.registration_complete`** is **false**, it does **not** render the full dashboard. Instead it renders only the **registration form** (see below). Once the member submits that form and it completes successfully, the app refreshes member data; on the next render `registration_complete` is true, and the full dashboard is shown.  
- If **`member.registration_complete`** is **true**, the full member dashboard is shown.

So: **first login after being added → dashboard loads → sees registration form until they complete it → then sees full dashboard.**

**Where it lives:**

- **`src/pages/DashboardPage.jsx`**. Session check and redirect to login happen inside `loadMemberData`.   
  - Member is fetched with `supabase.from('members').select('*').eq('user_id', userId)` (or by email).   
  - The conditional that shows the registration form is: `if (!member.registration_complete) { return ( ... <RegistrationForm ... /> ) }`.   
- After the form is completed, the form calls **`onComplete`**, which is **`handleRegistrationComplete`** — it simply calls **`loadMemberData()`** again so the member state is refreshed and the next render shows the full dashboard.

**UI behavior:** While `registration_complete` is false, only the registration form is rendered; the rest of the dashboard is hidden until the RPC succeeds and `loadMemberData` runs again.   
---

## 3\. Registration form: what they fill out and what happens

**What happens:** The **registration form** is a single form that collects the information we need to finish the member’s profile. Required fields typically include: **first name**, **last name**, **position/role**, **email**, **phone** (10-digit, formatted), **date of birth**, **school**, **city**, **state** (2-letter). Optional: LinkedIn, Instagram, additional info (notes). A **profile photo** is required: the user selects an image file; the form uploads it and saves the filename on the member record.

When they submit:

1. **Profile image:** If they chose a new image, the app uploads it to the **`members-images`** storage bucket in Supabase, with filename **`{member_id}.{ext}`** (e.g. `uuid.jpg`). If they already had an image (e.g. from a previous partial save), the form can keep that and not re-upload.  
2. **Member update:** The app calls an RPC (e.g. **`update_member_registration`**) with the form values and the image filename (or existing image path), and sets **`p_registration_complete: true`**. That RPC updates the current member’s row: name, email, phone, DOB, school, city, state, role, social links, notes, image, and **`registration_complete`**. The RPC is designed so the member can only update their **own** row (e.g. by checking that the session’s `user_id` matches the member’s `user_id`), and it runs with privileges that allow the update even if RLS would otherwise restrict it.  
3. **Refresh:** On success, the form shows a success message and calls **`onComplete()`**. The parent (DashboardPage) then runs **`loadMemberData()`**, so the member state now has **`registration_complete: true`**. The dashboard re-renders and shows the **full dashboard** instead of the registration form.

**Where it lives:**

- **Component:** **`src/components/RegistrationForm.jsx`**. It receives **`member`** (the current member object) and **`onComplete`** (callback to run after a successful submit). It pre-fills the form from `member` when it mounts. Validation: required fields, phone length, email format, state length, and “profile photo required” (either a new file or `member.image` already set).  
- **Upload:** `supabase.storage.from('members-images').upload(fileName, profileImage, { cacheControl: '3600', upsert: true })` with `fileName = ${member.member_id}.${fileExt}`.  
- **RPC:** `supabase.rpc('update_member_registration', { p_member_id, p_first_name, p_last_name, p_role, p_email, p_phone, p_dob, p_school_name, p_city, p_state, p_linkedin, p_instagram, p_notes, p_image, p_registration_complete: true })`. The exact parameter names and the RPC definition live in the migrations; the form is the main place that calls it.

**Data:**

- **Table:** **`members`**. The RPC updates the same row the user is tied to (by `user_id`). Key column for this flow: **`registration_complete`** is set to **true** so the dashboard will never show the registration form again for this member.  
- **Storage:** **`members-images`** — one file per member, filename **`{member_id}.{extension}`**.

---

## 4\. Summary flow

| Step | Who  | What |
| :---- | :---- | :---- |
| 1 | New member | Opens login page, enters email \+ temp password from welcome email. |
| 2 | Login page | `signInWithPassword` → success → redirect to `/dashboard.html`. |
| 3 | Dashboard | Loads, gets session, fetches member by `user_id`/email. If no session → redirect to login. |
| 4 | Dashboard | If `member.registration_complete === false` → render only **RegistrationForm**. |
| 5 | New member | Fills required fields (name, email, phone, DOB, school, city, state, role) and uploads profile photo. Submits. |
| 6 | RegistrationForm | Uploads image to `members-images` as `{member_id}.{ext}`; calls **update\_member\_registration** RPC with all fields and **registration\_complete: true**. |
| 7 | Dashboard | `onComplete()` → `loadMemberData()` → member state refreshes → **registration\_complete** is true → full dashboard is shown. |

From here, the member uses the dashboard like any other member (volunteer hours, bills/hours/applications/registrations if they have permission, leave/extension requests, etc.). Exec-specific flows (member management, viewing another member’s dashboard, etc.) are covered in the next sections.