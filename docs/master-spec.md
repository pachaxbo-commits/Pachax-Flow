# ESPECIFICACIÓN MAESTRA — PACHAX FLOW POS MULTI-RESTAURANTE

Este documento es la especificación técnica general y fuente de verdad del proyecto **PACHAX Flow**.

---

## 1. OBJETIVO GENERAL
Crear una plataforma SaaS multi-restaurante donde cada negocio pueda:
- Registrar y configurar su restaurante.
- Tener una o varias sucursales.
- Crear usuarios y empleados con permisos específicos.
- Configurar cajas, cocinas, áreas e impresoras térmicas.
- Administrar productos, menús, precios, extras y modificadores.
- Registrar pedidos para mesa, llevar, delivery y consumo rápido.
- Enviar comandas automáticamente a diferentes impresoras o pantallas KDS.
- Controlar pagos, cajas, cierres, gastos y ventas.
- Consultar reportes desde cualquier dispositivo.
- Trabajar temporalmente sin internet y sincronizar cuando vuelva la conexión.
- Personalizar logo, colores, moneda, impuestos y formato de impresión.

---

## 2. ARQUITECTURA MULTI-TENANT
Toda la información está aislada por `restaurantId` y `branchId`.

### Estructura de Firestore:
```
/restaurants/{restaurantId}
    /branches/{branchId}
    /members/{memberId}
    /roles/{roleId}
    /categories/{categoryId}
    /products/{productId}
    /modifierGroups/{modifierGroupId}
    /customers/{customerId}
    /tables/{tableId}
    /areas/{areaId}
    /orders/{orderId}
    /payments/{paymentId}
    /cashRegisters/{cashRegisterId}
    /cashSessions/{cashSessionId}
    /expenses/{expenseId}
    /printers/{printerId}
    /printJobs/{printJobId}
    /kitchenStations/{stationId}
    /auditLogs/{logId}
    /settings/{settingId}
    /subscriptions/{subscriptionId}

/users/{uid}
    memberships
    defaultRestaurantId
    profile
```

Cada documento operativo incluye:
`restaurantId`, `branchId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `status`.

---

## 3. PALETA Y GUÍA DE ESTILO VISUAL (PACHAX LIGHT THEME)
- **Fondo General**: Slate Light (`#F8FAFC`).
- **Superficies**: Blanco Puro (`#FFFFFF`) con bordes Slate 200 (`#E2E8F0`) y sombras finas.
- **Tipografía**: Plus Jakarta Sans / Playfair Display en títulos de marca.
- **Colores de Marca**:
  - Primario: Royal Blue (`#2563EB`)
  - Secundario: Deep Navy (`#1E3A8A`)
  - Acento: Sky Blue (`#0EA5E9`)
  - Éxito / Activo: Emerald (`#10B981`)
  - Alerta: Amber (`#F59E0B`)
  - Error: Rose (`#EF4444`)

---

## 4. ROADMAP DE ETAPAS DE IMPLEMENTACIÓN
- **Etapa 0**: Respaldo y Diagnóstico (Auditoría Técnica Completa).
- **Etapa 1**: Base Técnica & Modelo de Dominio Multi-Tenant.
- **Etapa 2**: Multi-Restaurante, Sucursales, Membresías y Seguridad Firestore.
- **Etapa 3**: Núcleo POS (Caja, Pedidos, Mesas, Modificadores, Pagos).
- **Etapa 4**: Cocina KDS y Flujo Configurable de Pedidos.
- **Etapa 5**: Motor de Impresión Profesional (Adaptadores, Perfiles, Cola Persistente).
- **Etapa 6**: Caja, Finanzas y Cierres de Turno.
- **Etapa 7**: Personalización de Branding y Layout Operativo.
- **Etapa 8**: Planes, Suscripciones, Entitlements y Feature Gates.
- **Etapa 9**: Expansión (Inventario, Delivery Avanzado, Clientes).
- **Etapa 10**: Adaptabilidad Multi-Plataforma (Android, Web, iOS/Escritorio futuro).
