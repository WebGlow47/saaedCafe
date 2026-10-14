# Saad Cafe

## Deploy to Render

1. Upload this folder to a GitHub repository.
2. In Render, select **New → Blueprint** and select that repository.
3. Render detects `render.yaml`. Confirm the service and click **Apply**.
4. Open the new `onrender.com` URL on Saaed’s phone and add it to the home screen.

This is a static site. Sales, inventory, expenses, and settings are stored in the phone’s browser. That is ideal for one phone and works without a database.

Before moving from the local version to the hosted URL, use **Settings → Download backup** on the current app. On the hosted app, use **Settings → Restore backup** to bring the data across. Keep periodic backups: clearing the browser’s site data or changing phones removes locally stored data.

For shared staff access, automatic cloud backups, or using the same data on multiple devices, add a backend database in a future version.
