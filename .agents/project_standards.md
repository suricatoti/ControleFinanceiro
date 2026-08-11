# 🛡️ Project Standards & Tech Stack Configuration (controle-financeiro)

This document outlines the architectural decisions and standards approved during the brainstorming phase. All agents must adhere to these standards.

## 1. Core Architecture & Persistence
- **Architecture**: Local-First Web Application (runs 100% in the browser).
- **Database / Persistence**: IndexedDB (for local browser storage).
- **Data Portability**: The database state can be exported as a JSON file (downloaded) and imported (uploaded) by the user to backup/restore their data.

## 2. Frontend Framework & State
- **Framework**: React.js built with Vite.
- **State Management**: React Context API & React Hooks.
- **Routing**: React Router DOM (for the 4 main screens).

## 3. UI Design System & Styling
- **Styling**: Tailwind CSS (v3 for maximum compatibility with UI libraries).
- **Component Library**: shadcn/ui (for modern, Lovable-like premium aesthetic).
- **Icons**: Lucide React.
