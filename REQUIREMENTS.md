UniBite: Project Specifications & Constraints

SYSTEM PROMPT FOR AI AGENT: You must read this entire document. This is the 100% strict specification for the project. Any code generated must fully comply with these rules. No external UI frameworks (like React, Angular, Vue, Bootstrap, Tailwind) are allowed.

Core Architecture & Technical Constraints

Tech Stack: HTML, Vanilla JavaScript, CSS, Node.js, SQLite.

Communication (E2): All client-server communication must strictly use the fetch() API. Data exchange (Posts, Requests, Ratings/Reviews) must be strictly in JSON format (no form-urlencoded).

DOM Manipulation (E1): Page updates must be smooth (add/remove cards, update lists) without page reloads (Single Page Application logic). Strictly use JavaScript Events (e.g., addEventListener, e.preventDefault()).

Design (E3): The UI must be modern, clean, and strictly Responsive (Mobile, Tablet, Desktop) using CSS Flexbox, Grid, and Media Queries. Note: UI usability, aesthetics, and responsiveness are explicitly graded.

User Roles & Workflows

A. Roles

Cook (Πάροχος): Creates posts, manages deliveries.

Consumer (Δέκτης): Browses feed, requests portions, rates meals.

Admin: Views global statistics and leaderboards.

B. Cook Features

B1. CRUD Posts: Cooks can Create, Edit, and Delete food posts. Posts must include: title, location/dorm, date/time, notes, allergens, and an optional photo.

B2. Manage Requests: Cooks can Approve or Reject requests for portions. Approving a request reduces the available portions.

B3. Completion & No-shows: Cooks mark successful pickups. If a consumer "no-shows", the cook flags it in the system, deducting 1 credit from the consumer as a penalty.

B4. Points System: Cooks earn +1 credit for each shared portion only if the consumer rates their meal higher than 3 out of 5 stars.

C. Consumer Features

C1. Dynamic Feed & Map: Active posts are shown in a list and on a map based on the pickup location. Sold-out posts (0 portions) must not disappear but must be visually grayed out. The user must be able to filter the map and sort the post list based on distance from a given location.

C2. Requests: Consumers need at least 1 credit to request a portion. New users start with a default wallet of 5 credits.

C3. Ratings (CRITICAL): Consumers rate received meals (1-5 stars). Rule: If a consumer fails to rate a meal within 48 hours of pickup, 1 credit is automatically deducted from them (requires a backend Cron Job).

D. Admin Features

D1. Global Stats: Admin views the total number of successful portions shared in the last month.

D2. Leaderboard: Shows a ranking table/list of the most active cooks on the platform.

Deliverables & Limitations

Team Limit: Maximum of 3 members per team.

Report Requirement: The final project report must strictly include the database design, specifically the Entity-Relationship Diagram (ERD) for the SQLite database.
