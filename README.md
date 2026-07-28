# Ahraz Mirza Live Job Dashboard

A mobile-friendly UK IT job dashboard tailored to Ahraz Mirza's CV.

## Features

- Automatically loads live vacancies from free public job feeds
- Refreshes every 30 minutes while open
- Scores roles against Ahraz's skills
- Highlights strongest matches
- Estimates recruiter call chance
- Tracks New, Applied, Interview and Rejected status in the browser
- Provides direct searches for Indeed, CWJobs, Totaljobs, JobServe and Reed
- Works on Netlify's free plan
- No paid hosting or API key required

## Netlify deployment

Connect this repository to the existing Netlify site and use these settings:

- Branch: `main`
- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

The `netlify.toml` file configures these settings automatically.

After connecting the repository, trigger a production deploy. Future GitHub updates will deploy automatically.

## Important

The percentage scores are transparent estimates based on CV skill overlap, role title, location and seniority. They are not supplied by employers and cannot guarantee a recruiter call.
