# HCI Online Examination System

## Project notes

This is a Human–Computer Interaction (HCI) school project for an online examination system. The project focuses on the interface, user experience, formatting, navigation, and interactive prototype rather than on production-level backend performance.

The project does not use a database. CSV files and browser storage are used for the demonstration data because the main objective is to present a working HCI interface.

Some interface elements may appear large or slightly over-scaled. This is manageable for the current prototype because the priority has been consistent formatting and a clear demonstration of the workflows rather than complete responsiveness and production scaling.

The Admin, Faculty, and Student workflows are connected and functional. Current polish includes role-aware light/dark themes, course pages, question authoring, exam attempts, grading, reports, System Management, and history-based navigation. The prototype remains browser-storage based and is not intended as a production deployment.

## Current verification

Run the automated browser-level suite with:

```powershell
node tests/run-all.js
```

The latest complete run on September 2, 2026 reports **964 passing and 6 failing assertions**. The six failures are known stale UI-structure expectations in three older test files; focused tests for the current interfaces pass. See [completion-rate.md](.plans/progress/completion-rate.md) for the exact breakdown.

Most planning notes, requirements, progress records, and design decisions are available in the [`.plans`](.plans) folder.

## Running the project locally

The project should be opened through a local web server instead of opening the HTML files directly.

1. Clone or pull the repository through GitHub in Visual Studio Code.
2. Open the project folder in VS Code.
3. Open a terminal in the project root.
4. Start a local server:

   ```powershell
   python -m http.server 8000
   ```

5. Open the following address in a browser:

   ```text
   http://localhost:8000/html/index.html
   ```

If `python` is unavailable on Windows, try:

```powershell
py -m http.server 8000
```

Keep the terminal open while using the website. Press `Ctrl+C` in the terminal to stop the server.

## Working with the repository

Use GitHub to connect the repository to Visual Studio Code. Before making changes, pull the latest version:

```powershell
git pull
```

After finishing and checking your changes, commit and push them so everyone receives the updated version:

```powershell
git add .
git commit -m "Describe your changes"
git push
```

Changes and improvements are welcome. Before changing an existing workflow, design decision, or shared file, please ping the group chat so the team can discuss and coordinate the change.

## Additional reference

Claude also generated an artifact that may be useful as a reference:

[Claude Code artifact](https://claude.ai/code/artifact/be825174-06bb-4d64-94d2-288611377b01)
