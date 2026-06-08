# UniBite: Project Specifications & Constraints

**SYSTEM PROMPT FOR AI AGENT:** You must read this entire document. This is the 100% strict specification for the project. Any code generated must fully comply with these rules. No external UI frameworks (like React, Bootstrap, Tailwind) are allowed[cite: 13, 15].

## Core Architecture
*   **Tech Stack:** HTML, Vanilla JavaScript, CSS, Node.js, SQLite[cite: 13, 15].
*   **Communication:** All client-server communication must strictly use the `fetch()` API and JSON format[cite: 13, 15].
*   **DOM Manipulation:** Page updates must be smooth (add/remove cards) without page reloads, using JavaScript Events (`addEventListener`, `e.preventDefault()`)[cite: 13, 15].
*   **Design:** The UI must be modern and strictly Responsive (Mobile, Tablet, Desktop) using CSS Flexbox, Grid, and Media Queries[cite: 13, 15].

## User Roles & Workflows

### A. Roles
1.  **Cook (Πάροχος):** Creates posts, manages deliveries[cite: 13, 15].
2.  **Consumer (Δέκτης):** Browses feed, requests portions, rates meals[cite: 13, 15].
3.  **Admin:** Views global statistics[cite: 13, 15].

### B. Cook Features
*   **B1. CRUD Posts:** Cooks can Create, Edit, and Delete posts[cite: 13, 15]. Posts include title, optional photo, notes, allergens[cite: 13, 15]. Posts automatically become "deleted" (hidden) after 48 hours[cite: 13, 15].
*   **B2. Delivery Details:** Post creation must require exact pickup location and exact pickup time[cite: 13, 15].
*   **B3. Request Management:** Cooks have a dashboard to Approve or Reject requests[cite: 13, 15]. Approving reduces available portions[cite: 13, 15]. Cooks mark successful pickups[cite: 13, 15]. If a consumer "no-shows", the cook flags it, deducting 1 credit from the consumer[cite: 13, 15].
*   **B4. Points System:** Cooks earn +1 credit if a consumer rates their meal higher than 3 out of 5 stars[cite: 13, 15].

### C. Consumer Features
*   **C1. Dynamic Feed & Map:** Active posts shown in a list and on a map based on pickup location[cite: 13, 15]. Sold-out posts (0 portions) must be visually grayed out[cite: 13, 15]. The user must be able to filter the map and sort the post list based on distance from a given location[cite: 13, 15].
*   **C2. Requests:** Consumers need at least 1 credit to request a portion[cite: 13, 15]. New users start with 5 credits[cite: 13, 15].
*   **C3. Ratings:** Consumers rate received meals (1-5 stars)[cite: 13, 15]. **CRITICAL:** If a consumer fails to rate a meal within 48 hours of pickup, 1 credit is automatically deducted from them[cite: 13, 15].

### D. Admin Features
*   **D1. Global Stats:** Admin sees total successful portions shared in the last month[cite: 13, 15].
*   **D2. Leaderboard:** Shows "Top Donor" and highest-rated meals[cite: 13, 15].

## Post States
1.  **Active:** Under 48 hours old, portions available (Visible)[cite: 13, 15].
2.  **Inactive:** Under 48 hours old, 0 portions (Visible but grayed out)[cite: 13, 15].
3.  **Deleted:** Over 48 hours old (Hidden from feed, kept in DB for stats)[cite: 13, 15].
