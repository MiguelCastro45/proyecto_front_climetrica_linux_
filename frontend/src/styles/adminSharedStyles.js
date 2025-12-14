// Estilos compartidos para todos los componentes de administración
export const adminStyles = {
  // Header principal
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '2px solid #f0f0f0',
    flexShrink: 0,
    gap: '20px',
    flexWrap: 'nowrap',
    background: 'white'
  },

  // Título
  title: {
    margin: 0,
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: 700,
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },

  // Contenedor de acciones (búsqueda + botón)
  headerActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    alignItems: 'center',
    flexShrink: 0,
    flexWrap: 'nowrap',
    justifyContent: 'flex-end'
  },

  // Contenedor de búsqueda
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0
  },

  // Input de búsqueda
  searchInput: {
    padding: '10px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    width: '320px',
    minWidth: '320px',
    maxWidth: '320px',
    background: 'white',
    color: '#374151',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit'
  },

  // Contenedor de tabla
  tableContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px'
  },

  // Tabla
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    overflow: 'hidden'
  },

  // Header de tabla
  tableHead: {
    background: 'linear-gradient(135deg, #3B5998, #2E86DE)'
  },

  // Celda de header
  tableHeaderCell: {
    color: 'white',
    fontWeight: 600,
    padding: '14px 12px',
    textAlign: 'left',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  // Fila de tabla
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background 0.2s ease'
  },

  // Celda de tabla
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: '#333'
  },

  // Celda centrada
  tableCellCenter: {
    padding: '12px',
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center'
  },

  // Badge de categoría
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'capitalize',
    background: '#e3f2fd',
    color: '#1976d2'
  },

  // Badge de estado activo
  statusBadgeActive: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#d1fae5',
    color: '#065f46'
  },

  // Badge de estado inactivo
  statusBadgeInactive: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#475569'
  },

  // Contenedor de acciones en tabla
  actionsCell: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '12px',
    fontSize: '14px'
  }
};
