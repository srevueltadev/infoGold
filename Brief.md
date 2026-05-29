# Project Brief: Exchange Monitor Enterprise Edition

## 1. Project Overview
The **Exchange Monitor** is a high-density financial dashboard designed for professional trading environments. It provides real-time monitoring of exchange rates, volatility indexes, and performance metrics through a technical, corporate-grade interface.

## 2. Target Audience
- Financial analysts
- Currency traders
- Corporate treasury departments
- Market monitors requiring high-density data visualization

## 3. Design Vision
- **Theme:** Slate Financial Corporate (Dark Mode)
- **Aesthetic:** Technical, robust, and professional. Uses a deep navy blue palette to reduce eye fatigue during long sessions.
- **Typography:** Clear, high-contrast financial typefaces (Manrope) for rapid data scanning.
- **Layout:** Modular card-based system with a fixed header for primary indicators and a flexible grid for secondary metrics.

## 4. Key Features & Components
### A. Header (Global Controls)
- **Status Indicator:** Live update heartbeat with timestamp.
- **Primary Actions:** "SALIR" (Exit) global action.
- **Branding:** Clear "EXCHANGE MONITOR" identifier with "ENTERPRISE EDITION" badge.

### B. Primary Indicator Section (The "Top 4")
- Four high-priority cards arranged horizontally.
- Features prominent currency values (e.g., Banco de Bogotá COP, Net Dania EUR/USD).
- Visual status badges (LIVE, GLOBAL, N/A).

### C. Technical Indicator Grid (The "Bottom 18")
- A 3x6 or 2x9 grid containing 18 detailed metric cards.
- Each card includes:
    - Metric Name (e.g., INDEX ALPHA, VOLUMEN RHO).
    - Current Percentage Value.
    - Status/Trend indicator (Stable, Percentage Change).

### D. Global Actions
- **Report Generation:** A prominent "COPIAR REPORTE" (Copy Report) button centered at the bottom of the monitoring area.

## 5. Technical Specifications
- **Device Target:** Desktop (optimized for large monitors).
- **Design System:** `{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}`
- **Color Palette:**
    - Primary Surface: `#0b1326`
    - Container/Cards: `#131b2e`
    - Accent: `#2563eb`
    - Text: `#ffffff` (Primary), `#94a3b8` (Secondary)

## 6. User Experience Goals
- **Density without Clutter:** Organizing 22+ total data points on a single screen without overwhelming the user.
- **Immediate Identification:** Using color-coded badges and clear hierarchy to highlight data freshness.
- **Workflow Efficiency:** Single-click reporting and clear exit paths.
