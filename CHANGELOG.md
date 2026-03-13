# SoloFlix Feature Implementation Reference

> Full documentation of all code changes made across database, backend, and frontend.
> Use this as a reference for future changes (by a developer or AI assistant).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Changes](#2-database-changes)
3. [Backend Changes](#3-backend-changes)
4. [Frontend Changes](#4-frontend-changes)
5. [Bugs, Errors & Fixes](#5-bugs-errors--fixes)
6. [Design Decisions & Choices](#6-design-decisions--choices)
7. [Known Gotchas & Pitfalls](#7-known-gotchas--pitfalls)
8. [File Reference Index](#8-file-reference-index)

---

## 1. Architecture Overview

| Layer     | Technology                                    | Path                                                                                  |
|-----------|-----------------------------------------------|---------------------------------------------------------------------------------------|
| Frontend  | React 18, Ant Design, React Bootstrap, react-slick, react-youtube | `streaming app frontend/streaming-app-frontend/`              |
| Backend   | Spring Boot 2.6.3, Java 17, GraphQL (graphql-java-tools 5.2.3), JPA/Hibernate | `Streaming-app/streaming-webapp-project/`              |
| Database  | MySQL (`streaming_app_db`), localhost:3306, root/password | -                                                                |
| API       | TMDB (The Movie Database) REST API via WebClient | -                                                               |

### Data Flow

```
React Frontend
   |  (axios POST to /graphql)
   v
Spring Boot GraphQL Resolvers (Query.java, Mutation.java)
   |  (calls ServiceLayer or Repository)
   v
ServiceLayer.java  <---->  TMDB REST API (WebClient)
   |
   v
JPA Repository  <---->  MySQL Database
```

### GraphQL Schema Loading Order

GraphQL schemas are loaded from `src/main/resources/graphql/movie/`. The `type Query` and `type Mutation` base definitions **must only appear once**. All other `.graphqls` files must use `extend type Query` / `extend type Mutation`.

| File              | Defines                     | Notes                                      |
|-------------------|-----------------------------|--------------------------------------------|
| `movie.graphqls`  | `type Movie`, `type Query`  | Base Query definition lives here           |
| `user.graphqls`   | `type User`, `type Mutation` | Base Mutation definition lives here        |
| `mylist.graphqls` | `type MyList`               | Uses `extend type Query`, `extend type Mutation` |
| `movie.graphqls`  | `cacheMovie` mutation       | Uses `extend type Mutation` (NOT `type Mutation`) |

---

## 2. Database Changes

### 2a. `my_list` table — new columns

```sql
ALTER TABLE my_list
  ADD COLUMN notes TEXT NULL,
  ADD COLUMN user_rating DOUBLE NULL,
  ADD COLUMN watched BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN recommended BOOLEAN NULL,
  ADD COLUMN date_added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

These columns support: personal notes, user rating (0-10), watched status, recommend/not-recommend/no-opinion, and the date the movie was added to the list.

### 2b. Existing tables (unchanged)

- `movie` — id, movie_ref, movie_title, movie_description, movie_year, movie_video, movie_img, movie_rating
- `my_list` — id, movie_id (FK to movie.id), user_id (FK to user.email)
- `user` — email (PK), username, password, enabled

---

## 3. Backend Changes

### 3a. `Movie.java` — Entity Model

**Path:** `models/Movie.java`

**Key field mappings (TMDB JSON -> Entity -> DB):**

| TMDB JSON field | Java field  | DB column       | Notes                                    |
|-----------------|-------------|-----------------|------------------------------------------|
| `id`            | `reference` | `movie_ref`     | `@JsonProperty("id")` maps TMDB's `id`  |
| (auto)          | `id`        | `id`            | `@GeneratedValue(IDENTITY)`, DB primary key |
| `original_title`| `title`     | `movie_title`   |                                          |
| `overview`      | `description`| `movie_description` |                                      |
| `release_date`  | `date`      | `movie_year`    |                                          |
| `key`           | `video`     | `movie_video`   | Set manually to full YouTube URL         |
| `poster_path`   | `image`     | `movie_img`     | `getImage()` prepends TMDB base URL      |
| `vote_average`  | `rating`    | `movie_rating`  |                                          |

**Changes made:**

```java
// Added @JsonIgnore to getId/setId to prevent Jackson deserialization conflict
@JsonIgnore
public BigInteger getId() {
    return id;
}

@JsonIgnore
public void setId(BigInteger id) {
    this.id = id;
}
```

**Why `@JsonIgnore` is critical:** See [Bug #2](#bug-2-all-tmdb-searches-return-no-results) below.

### 3b. `MyList.java` — Entity Model

**Path:** `models/sections/MyList.java`

**New entity with full CRUD support.** Fields:

| Field         | Type      | DB Column     | Notes                                  |
|---------------|-----------|---------------|----------------------------------------|
| `id`          | BigInteger| `id`          | Auto-generated PK                      |
| `movie`       | Movie     | `movie_id`    | `@ManyToOne(EAGER)`, FK to movie.id    |
| `user`        | User      | `user_id`     | `@ManyToOne(EAGER)`, FK to user.email  |
| `notes`       | String    | `notes`       | TEXT, nullable                         |
| `userRating`  | Double    | `user_rating` | nullable                               |
| `watched`     | Boolean   | `watched`     | NOT NULL, default false                |
| `recommended` | Boolean   | `recommended` | nullable (null = no opinion)           |
| `dateAdded`   | Date      | `date_added`  | TIMESTAMP, set in constructor          |

Constructor sets `dateAdded = new Date()` and `watched = false`.

### 3c. `MovieRepository.java`

**Path:** `repository/MovieRepository.java`

```java
@Repository
public interface MovieRepository extends JpaRepository<Movie, BigInteger> {
    List<Movie> findByTitleContainingIgnoreCase(String title);   // existing
    Optional<Movie> findByReference(BigInteger reference);       // NEW - lookup by TMDB id
}
```

`findByReference` is used by `cacheMovie()` to check if a movie is already cached before saving.

### 3d. `MyListRepository.java`

**Path:** `repository/MyListRepository.java`

```java
@Repository
public interface MyListRepository extends JpaRepository<MyList, BigInteger> {
    Optional<MyList> findById(BigInteger id);
    List<MyList> findByUserEmail(String userEmail);
    Optional<MyList> findByUserEmailAndMovieId(String userEmail, BigInteger movieId);  // duplicate check
}
```

### 3e. `Query.java` — GraphQL Query Resolver

**Path:** `resolvers/Query.java`

**New queries added:**

```java
// Returns all MyList items for a user
public List<MyList> findMyListByUserEmail(String email) {
    return myListRepository.findByUserEmail(email);
}

// Checks if a specific movie is in a user's list (returns null if not found)
public MyList findMyListItem(String userId, String movieId) {
    return myListRepository.findByUserEmailAndMovieId(userId, new BigInteger(movieId))
            .orElse(null);
}

// Searches TMDB API for movies (does NOT auto-cache)
public List<Movie> searchMovies(String query) {
    return serviceLayer.searchMovies(query);
}

// Searches only the local database
public List<Movie> searchMoviesInDatabase(String query) {
    return movieRepository.findByTitleContainingIgnoreCase(query);
}
```

### 3f. `Mutation.java` — GraphQL Mutation Resolver

**Path:** `resolvers/Mutation.java`

**New mutations added:**

| Mutation            | Parameters                                          | Returns    | Notes                                   |
|---------------------|-----------------------------------------------------|------------|-----------------------------------------|
| `addToMyList`       | userEmail, movieId, notes?, userRating?, watched?, recommended? | `MyList!`  | Throws if movie already in list         |
| `updateMyListItem`  | id, notes?, userRating?, watched?, recommended?     | `MyList!`  | Partial update (null = don't change)    |
| `removeFromMyList`  | id                                                  | `Boolean!` | Deletes the entry                       |
| `toggleWatched`     | id                                                  | `MyList!`  | Flips watched boolean                   |
| `cacheMovie`        | movieId (TMDB reference as string)                  | `Movie`    | Delegates to ServiceLayer.cacheMovie()  |

### 3g. `ServiceLayer.java` — Business Logic

**Path:** `service/ServiceLayer.java`

**New methods:**

#### `searchMovies(String query)` — TMDB Search (No Auto-Cache)

```java
public List<Movie> searchMovies(String query) {
    // 1. Call TMDB search API
    // 2. Remove movies with null reference
    // 3. Set defaults for ALL non-null GraphQL fields:
    //    - id = reference (for unsaved movies)
    //    - title = "Unknown Title" if null
    //    - description, date, video = "" if null
    //    - image = "" if null or contains "null"
    // 4. Return list (NOT saved to DB)
}
```

#### `cacheMovie(String movieId)` — Save a Single Movie to DB

```java
public Movie cacheMovie(String movieId) {
    // 1. Check if already cached via movieRepository.findByReference()
    // 2. If not, fetch from TMDB detail endpoint (/3/movie/{id})
    // 3. Fetch video from TMDB videos endpoint (/3/movie/{id}/videos)
    // 4. Set video URL (or "" if no trailer)
    // 5. Save to database and return
}
```

### 3h. GraphQL Schema Files

#### `movie.graphqls`

```graphql
type Movie {
    id: String!
    reference: String!
    title: String!
    description: String!
    date: String!
    image: String!
    video: String!
    rating: Float!
}

type Query {
    movies: [Movie]!
    findMovieByTitle(title: String): [Movie]
    findMovieById(id: String): Movie
    searchMovies(query: String!): [Movie]!
    searchMoviesInDatabase(query: String!): [Movie]!
}

extend type Mutation {
    cacheMovie(movieId: String!): Movie
}
```

#### `mylist.graphqls`

```graphql
type MyList {
    id: String!
    movie: Movie!
    user: User!
    notes: String
    userRating: Float
    watched: Boolean!
    recommended: Boolean
    dateAdded: String
}

extend type Query {
    myLists: [MyList]!
    findMyListByUserEmail(email: String!): [MyList]!
    findMyListItem(userId: String!, movieId: String!): MyList
}

extend type Mutation {
    addToMyList(userEmail: String!, movieId: String!, notes: String,
               userRating: Float, watched: Boolean, recommended: Boolean): MyList!
    updateMyListItem(id: String!, notes: String, userRating: Float,
                     watched: Boolean, recommended: Boolean): MyList!
    removeFromMyList(id: String!): Boolean!
    toggleWatched(id: String!): MyList!
}
```

#### `user.graphqls`

```graphql
type User {
    email: String!
    username: String!
    password: String!
    enabled: Boolean!
}

extend type Query {
    users: [User]!
    findUserByEmail(email: String): [User]
}

type Mutation {
    addUser(email: String username: String password: String enabled: Boolean): User
    updateUser(email: String username: String password: String enabled: Boolean): User
    deleteUserByEmail(email: String): Boolean
}
```

---

## 4. Frontend Changes

### 4a. `MovieService.js` — API Service Layer

**Path:** `src/services/MovieService.js`

**New methods added:**

| Method                     | GraphQL Operation | Notes                                          |
|----------------------------|-------------------|-------------------------------------------------|
| `getMyList(email)`         | Query             | Returns all MyList items with movie data + metadata |
| `addToMyList(email, movieId)` | Mutation       | Creates a new MyList entry                     |
| `updateMyListItem(id, updates)` | Mutation    | Partial update (notes, userRating, watched, recommended) |
| `removeFromMyList(id)`     | Mutation          | Deletes a MyList entry                         |
| `toggleWatched(id)`        | Mutation          | Flips watched boolean                          |
| `checkInMyList(email, movieId)` | Query        | Returns the MyList item if exists, null if not |
| `searchMovies(query)`      | Query             | Searches TMDB API via backend                  |
| `searchMoviesInDatabase(query)` | Query        | Searches local DB only                         |
| `cacheMovie(movieId)`      | Mutation          | Saves a TMDB movie to the local database       |

All methods use `axios.post(API_URL, { query })` where `API_URL = 'http://localhost:8080/graphql'`.

**Important:** `searchMovies` requests both `id` and `reference` fields. The `reference` is the TMDB movie ID and is used as the identifier when selecting movies to cache.

### 4b. `NavigationBar.js` — Search Bar + Modals

**Path:** `src/components/NavigationBar.js`

**Features implemented:**

1. **Ant Design AutoComplete search bar** inline in the navbar
2. **Three-tier search flow:**
   - Type in search bar -> debounce (300ms) -> search local DB
   - If DB has results: show dropdown with movie poster, title, year, rating (tagged "Cache")
   - If DB has no results: show Modal prompting user to search TMDB API
   - If user clicks "Search TMDB API": query TMDB, show selection modal
3. **TMDB Selection Modal:** Checkboxes for each result; user selects which movies to cache
4. **Caching:** Selected movies are cached in parallel via `MovieService.cacheMovie()`
5. **Movie Detail Modal:** Click a search result -> opens modal with YouTube trailer, metadata, description, and "Add to My List" button
6. **Add to My List:** Checks if movie is already in list; shows "In My List" (greyed) or "Add to My List" (red)

**State variables:**

| State                | Type      | Purpose                                   |
|----------------------|-----------|-------------------------------------------|
| `searchValue`        | string    | Current search input text                 |
| `searchOptions`      | array     | Ant Design AutoComplete options           |
| `selectedSearchMovie`| object    | Movie selected from dropdown              |
| `isSearchModalOpen`  | boolean   | Video detail modal visibility             |
| `searchPlayer`       | object    | YouTube player instance for modal         |
| `searching`          | boolean   | Loading spinner state                     |
| `lastSearchQuery`    | string    | Saved query for TMDB search               |
| `showApiPrompt`      | boolean   | "Search TMDB?" prompt modal visibility    |
| `searchSource`       | string    | 'db' or 'api' indicator                   |
| `tmdbResults`        | array     | TMDB search results                       |
| `showSelectionModal` | boolean   | TMDB selection modal visibility           |
| `selectedMovies`     | array     | Selected movie references for caching     |
| `cachingMovies`      | boolean   | Loading state during cache operation      |
| `isInMyList`         | boolean   | Whether current movie is in user's list   |
| `addingToList`       | boolean   | Loading state for add-to-list             |

### 4c. `MovieCarousel.js` — "Add to My List" Button

**Path:** `src/components/MovieCarousel.js`

**Changes:**

- Added `isInMyList` and `addingToList` state
- On modal open (`handleMovieClick`): calls `MovieService.checkInMyList()` to check status
- Added `handleAddToList()`: calls `MovieService.addToMyList()`, shows success/error feedback
- Button in modal after description: red "Add to My List" or grey "In My List"

**Note on data structure:** Carousel movies use nested structure `movie.movie.id`, `movie.movie.title` etc., because the carousel data comes from section entities (PopularMovie, TrendingMovie, etc.) that wrap a Movie.

### 4d. `BigVideo.js` — Hero Section "Add to My List"

**Path:** `src/components/BigVideo.js`

**Changes:**

- Movie is hardcoded (Godzilla x Kong, videoId: `lV1OOlGwExM`)
- On mount, looks up the movie in the database via `MovieService.searchMovies(title)` to get the DB id
- If found, checks if it's in the user's list
- Same "Add to My List" / "In My List" button pattern as other modals

### 4e. `MyList.js` — Full My List Page

**Path:** `src/components/MyList.js`

**Complete rewrite from placeholder.** Features:

- **Authentication check:** Redirects to `/login` if no `access_token`
- **Filter controls** (Ant Design Select):
  - Sort by: Date Added, Title, TMDB Rating, My Rating
  - Filter Watched: All, Watched, Unwatched
  - Filter Recommended: All, Recommended, Not Recommended, No Opinion
- **Card grid** (`CSS grid, auto-fill, minmax 200px`):
  - Movie poster with watched badge (green checkmark) and recommend badge (thumbs up/down)
  - Title, TMDB rating, user rating
  - Action buttons: toggle watched, edit, delete
- **Click poster:** Opens video modal with YouTube trailer + metadata + personal notes
- **Edit modal:** Notes textarea, 10-star rating, watched switch, recommend radio group
- **Delete:** Removes from list with `MovieService.removeFromMyList()`

### 4f. `index.css` — Styles

**Path:** `src/index.css`

New styles added for:

- `.mylist-page`, `.mylist-heading`, `.mylist-controls`, `.control-group`
- `.mylist-grid`, `.mylist-card`, `.mylist-card-poster`, `.mylist-card-info`
- `.mylist-card-title`, `.mylist-card-ratings`, `.tmdb-rating`, `.user-rating`
- `.mylist-card-actions`, `.action-btn`, `.action-btn-danger`
- `.watched-badge`, `.recommend-badge`, `.recommend-yes`, `.recommend-no`
- `.edit-modal-body`, `.edit-field`
- `.search-dropdown` (for navbar search autocomplete)

All styles follow the dark theme (blacks, dark greys, Netflix red `#e50914`).

---

## 5. Bugs, Errors & Fixes

### Bug #1: "Cannot read properties of null (reading 'id')"

**Symptom:** Clicking "Search TMDB API" crashed the frontend with `TypeError: Cannot read properties of null (reading 'id')`.

**Root cause:** TMDB movies returned by `searchMovies` had null `id` (not saved to DB, `@GeneratedValue(IDENTITY)`) and null `video` (movies without trailers). The GraphQL schema marks these as `String!` (non-null), so **GraphQL serialization failed silently** — each movie in the list became `null`. The frontend then tried to access `.id` on a null entry.

**Fix:**
1. Added `getId()`/`setId()` to `Movie.java` (with `@JsonIgnore` — see Bug #2)
2. In `ServiceLayer.searchMovies()`, set defaults for ALL non-null GraphQL fields before returning:
   ```java
   if (movie.getId() == null) movie.setId(movie.getReference());
   if (movie.getTitle() == null) movie.setTitle("Unknown Title");
   if (movie.getDescription() == null) movie.setDescription("");
   if (movie.getDate() == null) movie.setDate("");
   if (movie.getVideo() == null) movie.setVideo("");
   ```
3. In frontend, filter out null entries: `data.searchMovies.filter(movie => movie !== null)`

**Lesson:** When returning unsaved JPA entities via GraphQL, ANY `@GeneratedValue(IDENTITY)` field will be null. If the GraphQL schema marks that field as non-null (`String!`), the **entire list element silently becomes null** — no error is thrown by GraphQL, it just returns `null` for that element.

---

### Bug #2: ALL TMDB Searches Return No Results

**Symptom:** After adding `getId()`/`setId()` to Movie.java, every TMDB search returned zero results, even though the API was working (verified via curl).

**Root cause:** **Jackson deserialization conflict.** The Movie entity has:
- `@JsonProperty("id")` on the `reference` field — maps TMDB JSON's `"id"` to `reference`
- A newly added `setId(BigInteger id)` — Jackson auto-detected this as matching JSON property `"id"` too

Jackson chose `setId()` over `@JsonProperty("id")` on `reference`, so TMDB's movie ID was routed to the entity's `id` field instead of `reference`. Then `reference` was null for ALL movies, and `removeIf(movie.getReference() == null)` removed everything.

**Fix:** Added `@JsonIgnore` to both `getId()` and `setId()`:

```java
@JsonIgnore
public BigInteger getId() { return id; }

@JsonIgnore
public void setId(BigInteger id) { this.id = id; }
```

**Lesson:** When an entity has `@JsonProperty("id")` on one field and a `setId()` method for a different field, Jackson sees a conflict. The `@JsonIgnore` on the setter ensures Jackson only uses the `@JsonProperty` annotation to map the JSON `"id"` to the intended field.

---

### Bug #3: ALL Movies Fail to Cache ("unable to cache, might not have a trailer")

**Symptom:** After TMDB search worked again, selecting movies and clicking "Cache Selected" always failed with "Failed to cache movies - they may not have trailers available". Every `cacheMovie` mutation returned null.

**Root cause:** **Duplicate `type Mutation` definition in GraphQL schemas.**

- `user.graphqls` defined `type Mutation { addUser, updateUser, deleteUserByEmail }`
- `movie.graphqls` ALSO defined `type Mutation { cacheMovie }` (WRONG)
- `mylist.graphqls` correctly used `extend type Mutation`

Having two `type Mutation` blocks caused a GraphQL schema conflict. The `cacheMovie` mutation was not properly registered, so all calls returned null.

**Fix:** Changed `movie.graphqls` from `type Mutation` to `extend type Mutation`:

```graphql
// BEFORE (broken):
type Mutation {
    cacheMovie(movieId: String!): Movie
}

// AFTER (fixed):
extend type Mutation {
    cacheMovie(movieId: String!): Movie
}
```

**Lesson:** In GraphQL with multiple `.graphqls` files, `type Mutation` can only appear ONCE across all files. All other files must use `extend type Mutation`. Same rule for `type Query`.

---

### Bug #4: "No results on TMDB" Notification Not Visible

**Symptom:** When TMDB search returned no results, the notification was shown via Ant Design's `message.info()` at the top of the viewport. If the user had scrolled down, they couldn't see it.

**Fix:** Replaced `message.info()` with `Modal.info()`:

```javascript
Modal.info({
  title: <span style={{ color: '#fff' }}>No Results</span>,
  content: (
    <p style={{ color: '#d1d1d1', marginTop: '10px' }}>
      No results found for <strong>"{lastSearchQuery}"</strong> on TMDB.
    </p>
  ),
  className: 'movie-details-modal',
  centered: true,
  okButtonProps: { style: { backgroundColor: '#e50914', borderColor: '#e50914' } },
});
```

**Lesson:** `message.info()` shows at the top of the viewport. For important notifications, use `Modal.info()` which is centered and modal (blocks interaction until dismissed).

---

### Bug #5: Search Spinner Stuck

**Symptom:** The search bar spinner would get stuck in the "searching" state if an error occurred during the search.

**Fix:** Wrapped search logic in `try/catch/finally` blocks. The `finally` block always sets `setSearching(false)`, regardless of success or failure.

---

### Bug #6: `cacheMovie` Used `findById` Instead of `findByReference`

**Symptom:** `cacheMovie()` was checking for existing movies using `movieRepository.findById(refId)`, which looks up by the auto-generated database primary key (`id`), not the TMDB movie reference. This meant it never found existing cached movies correctly.

**Fix:** Added `findByReference(BigInteger reference)` to `MovieRepository` and changed `cacheMovie()` to use it:

```java
Optional<Movie> existing = movieRepository.findByReference(refId);
```

---

## 6. Design Decisions & Choices

### 6a. Three-Tier Search Instead of Auto-Cache

**Decision:** Search TMDB results are NOT automatically cached to the database.

**Flow:**
1. User types -> search local DB first
2. If no results -> show prompt asking if they want to search TMDB
3. If they click yes -> show TMDB results with checkboxes
4. User selects which movies to cache -> only those are saved

**Rationale:** User wanted control over what gets saved to their local database.

### 6b. Two Separate Search Queries

**Decision:** Two GraphQL queries: `searchMovies` (TMDB API) and `searchMoviesInDatabase` (local DB only).

**Rationale:** The navbar search first queries the database. Only if no results are found does it prompt the user to search TMDB. This requires separate endpoints.

### 6c. Movie Identity: `id` vs `reference`

**Decision:**
- `Movie.id` = auto-generated database primary key (BigInteger, `@GeneratedValue(IDENTITY)`)
- `Movie.reference` = TMDB movie ID (mapped via `@JsonProperty("id")`)

When working with **unsaved TMDB movies** (search results not yet cached), use `reference` as the identifier. When working with **saved movies** (in the database), use `id` for relations (foreign keys, MyList.movie_id, etc.).

The TMDB selection modal uses `movie.reference` for checkbox state and cache calls. The "Add to My List" feature uses `movie.id` (the DB id) because only cached movies can be added to the list.

### 6d. Movies Without Trailers

**Decision:** Movies are cached even if they don't have a YouTube trailer. The `video` field is set to `""` (empty string) instead of null.

**Rationale:** Previously, movies without trailers were not saved. This caused all cache operations to fail for movies without trailers, which was confusing to the user.

### 6e. Hardcoded User Email

**Decision:** `USER_EMAIL = 'plainUser@gmail.com'` is hardcoded in multiple components.

**Rationale:** The app uses mock OAuth authentication. The user email is hardcoded for simplicity. In a production app, this would come from the authentication context/token.

### 6f. `image` Field and the Base URL

**Decision:** `Movie.getImage()` always prepends `"https://image.tmdb.org/t/p/w500"` to the stored `image` value.

**Implication:** When `image` is null, `getImage()` returns `"https://image.tmdb.org/t/p/w500null"` — a non-null string that's a broken URL. The `searchMovies` method checks for this and sets `image` to `""` if it contains "null", resulting in `"https://image.tmdb.org/t/p/w500"` (still not a valid image, but won't crash).

---

## 7. Known Gotchas & Pitfalls

### 7a. GraphQL Non-Null Field Silent Failures

If a GraphQL schema field is marked `String!` but the Java resolver returns null for that field, GraphQL **silently sets the entire parent object to null** in the response. No error is thrown. This is extremely hard to debug because the error is invisible — you just get `null` entries in arrays.

**Always check:** Every `!` (non-null) field in the GraphQL schema has a non-null value in the Java object being returned.

### 7b. Jackson `@JsonProperty` vs Auto-Detected Setters

Jackson auto-detects setter methods as property mappings. If you have `@JsonProperty("id")` on field A and a `setId()` method for field B, Jackson will see a conflict and may route the JSON `"id"` to field B instead of field A. Use `@JsonIgnore` on the setter to resolve this.

### 7c. `@GeneratedValue(IDENTITY)` Fields Are Null Until Saved

JPA entities with `@GeneratedValue(strategy = GenerationType.IDENTITY)` have null `id` fields until `repository.save()` is called. If you return unsaved entities from a GraphQL resolver, the `id` will be null.

### 7d. `type Mutation` Can Only Appear Once

In a multi-file GraphQL schema setup (graphql-java-tools), `type Query` and `type Mutation` can only be defined once. All other files must use `extend type Query` / `extend type Mutation`. Duplicates cause silent failures where mutations don't register.

### 7e. Movie.getImage() Prepends Base URL

Never store the full TMDB image URL in the `image` field. The getter prepends the base URL automatically. Store only the path (e.g., `/abc123.jpg`).

### 7f. `addToMyList` Uses Movie's DB `id`, Not TMDB `reference`

The `addToMyList` mutation takes `movieId` which is the **database primary key** (auto-generated), not the TMDB reference. The movie must be cached in the database first before it can be added to the user's list.

---

## 8. File Reference Index

### Backend Files Changed

| File | Path (relative to backend root) | Changes |
|------|------|---------|
| Movie.java | `src/main/java/.../models/Movie.java` | Added `@JsonIgnore` on `getId()`/`setId()` |
| MyList.java | `src/main/java/.../models/sections/MyList.java` | New entity with notes, userRating, watched, recommended, dateAdded |
| MovieRepository.java | `src/main/java/.../repository/MovieRepository.java` | Added `findByReference()` |
| MyListRepository.java | `src/main/java/.../repository/MyListRepository.java` | New repo with `findByUserEmail()`, `findByUserEmailAndMovieId()` |
| Query.java | `src/main/java/.../resolvers/Query.java` | Added `findMyListByUserEmail`, `findMyListItem`, `searchMovies`, `searchMoviesInDatabase` |
| Mutation.java | `src/main/java/.../resolvers/Mutation.java` | Added `addToMyList`, `updateMyListItem`, `removeFromMyList`, `toggleWatched`, `cacheMovie` |
| ServiceLayer.java | `src/main/java/.../service/ServiceLayer.java` | Added `searchMovies()` (no auto-cache), `cacheMovie()` |
| movie.graphqls | `src/main/resources/graphql/movie/movie.graphqls` | Added `reference` to Movie type, `searchMovies` + `searchMoviesInDatabase` queries, `cacheMovie` mutation (as `extend type Mutation`) |
| mylist.graphqls | `src/main/resources/graphql/movie/mylist.graphqls` | New schema for MyList type + queries + mutations |

### Frontend Files Changed

| File | Path (relative to frontend root) | Changes |
|------|------|---------|
| MovieService.js | `src/services/MovieService.js` | Added 8 new API methods |
| NavigationBar.js | `src/components/NavigationBar.js` | Search bar, 3 modals (detail, API prompt, selection), Add to My List |
| MovieCarousel.js | `src/components/MovieCarousel.js` | "Add to My List" button in movie modal |
| BigVideo.js | `src/components/BigVideo.js` | "Add to My List" button in hero modal |
| MyList.js | `src/components/MyList.js` | Complete rewrite — card grid, filters, sort, edit/delete, video modal |
| index.css | `src/index.css` | Dark theme styles for My List page, search dropdown, badges |

### Database Changes

| Change | SQL |
|--------|-----|
| Add columns to `my_list` | `ALTER TABLE my_list ADD COLUMN notes TEXT NULL, ADD COLUMN user_rating DOUBLE NULL, ADD COLUMN watched BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN recommended BOOLEAN NULL, ADD COLUMN date_added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;` |
