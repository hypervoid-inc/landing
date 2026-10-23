-- Moments in a deck visit (PDF sent, finished, closed, ...) each post their
-- own Discord message, since an edited message notifies nobody. This counts
-- them per visit, to cap how many one visit can post.
ALTER TABLE deck_pings ADD COLUMN events INTEGER NOT NULL DEFAULT 0;
