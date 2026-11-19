# BoilerFound prototype — Found item report

## Chosen user flow

**Flow 2: Found item report.** A Purdue community member reports an item they found, receives safe-handling guidance for wallets, IDs, and payment cards, submits a photo and the item's found location (with optional handoff details), and sees a confirmation with the drop-off information.

The prototype includes the flow's start screen, sensitive-item decision and guidance, report form, and thank-you screen. The screens follow the teammate found-flow prototype and its implementation notes in `feature/found-item-frontend`.

## API call

Submitting a report sends a `POST` request to `https://jsonplaceholder.typicode.com/posts`. The JSON body contains the found location, optional handoff location, description, owner-verification question, and photo filename. JSONPlaceholder returns a mock report ID used on the confirmation screen. This demonstrates an API request; it does not persist reports in BoilerFound's backend, and the photo contents are not uploaded.

## Figma

Figma project link: **add your team's Figma URL before submission**.

## Run

Open `index.html` in a browser. An internet connection is required for the demo API request and Google Fonts. If the API is unavailable, the form keeps its entries and lets you retry.
