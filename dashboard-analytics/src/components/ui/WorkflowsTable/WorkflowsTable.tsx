import { useState } from 'react'
import {
  IconFolder,
  IconPencil,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
  IconHeadset,
  IconMessage2,
} from '@tabler/icons-react'
import { WorkflowIcon } from '../../icons'
import { cn } from '../../../lib/utils'

export type WorkflowItemType = 'folder' | 'workflow' | 'roleplay-voice' | 'roleplay-mirror'

export interface WorkflowItem {
  id: string
  name: string
  type: WorkflowItemType
  itemCount?: number
  language?: string
  badge?: {
    label: string
    variant: 'success' | 'info' | 'warning'
  }
  /** Cross-reference chip linking to the paired workflow/roleplay item */
  linkedItem?: {
    label: string
    type: WorkflowItemType
  }
  createdBy?: string
  lastUpdatedOn?: string
}

interface WorkflowsTableProps {
  items: WorkflowItem[]
  totalItems: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemClick?: (item: WorkflowItem) => void
  onItemEdit?: (item: WorkflowItem) => void
  onItemMenu?: (item: WorkflowItem) => void
  selectedItems?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  /** Show the Language column (used by the AI Roleplay list) */
  showLanguageColumn?: boolean
  /** Show the specific roleplay subtype ("Voice" / "Mirror Roleplay") instead of the generic "Roleplay" label */
  detailedRoleplayLabels?: boolean
}

export function WorkflowsTable({
  items,
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemClick,
  onItemEdit,
  onItemMenu,
  selectedItems = [],
  onSelectionChange,
  showLanguageColumn = false,
  detailedRoleplayLabels = false,
}: WorkflowsTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startRow = (currentPage - 1) * itemsPerPage + 1
  const endRow = Math.min(currentPage * itemsPerPage, totalItems)

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectedItems.length === items.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(items.map((item) => item.id))
    }
  }

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter((id) => id !== itemId))
    } else {
      onSelectionChange([...selectedItems, itemId])
    }
  }

  const getTypeIcon = (type: WorkflowItemType, size = 20, colorClassName = 'text-secondary-600') => {
    switch (type) {
      case 'folder':
        return <IconFolder size={size} stroke={1.5} className={colorClassName} />
      case 'workflow':
        return <WorkflowIcon size={size} stroke={1.5} className={colorClassName} />
      case 'roleplay-voice':
        return <IconHeadset size={size} stroke={1.5} className={colorClassName} />
      case 'roleplay-mirror':
        return <IconMessage2 size={size} stroke={1.5} className={colorClassName} />
    }
  }

  const getTypeLabel = (type: WorkflowItemType) => {
    switch (type) {
      case 'folder':
        return 'Simulation'
      case 'workflow':
        return 'Workflow'
      case 'roleplay-voice':
        return detailedRoleplayLabels ? 'Voice' : 'Roleplay'
      case 'roleplay-mirror':
        return detailedRoleplayLabels ? 'Mirror Roleplay' : 'Roleplay'
    }
  }

  const getBadgeClasses = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-success-100 text-success-600'
      case 'info':
        return 'bg-info-50 text-info-500'
      case 'warning':
        return 'bg-warning-100 text-warning-600'
      default:
        return 'bg-secondary-100 text-secondary-700'
    }
  }

  const renderPaginationPages = () => {
    const pages: (number | string)[] = []
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (currentPage > 3) {
        pages.push('...')
      }
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className="workflows-table-wrapper">
      <div className="workflows-table-container">
        <div className="workflows-table">
        {/* Table Header */}
        <div className="workflows-table-header">
          <div className="workflows-table-cell workflows-table-cell-checkbox">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={handleSelectAll}
              className="workflows-checkbox"
            />
          </div>
          <div className="workflows-table-cell workflows-table-cell-name">
            <span>Name</span>
          </div>
          <div className="workflows-table-cell workflows-table-cell-type">
            <span>Type</span>
          </div>
          {showLanguageColumn && (
            <div className="workflows-table-cell workflows-table-cell-language">
              <span>Language</span>
            </div>
          )}
          <div className="workflows-table-cell workflows-table-cell-created">
            <span>Created by</span>
          </div>
          <div className="workflows-table-cell workflows-table-cell-updated">
            <span>Last updated on</span>
          </div>
        </div>

        {/* Table Body */}
        <div className="workflows-table-body">
          {items.map((item) => {
            const isSelected = selectedItems.includes(item.id)
            const isHovered = hoveredRow === item.id

            return (
              <div
                key={item.id}
                className={cn(
                  'workflows-table-row',
                  isSelected && 'workflows-table-row-selected',
                  isHovered && 'workflows-table-row-hovered'
                )}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onItemClick?.(item)}
              >
                <div className="workflows-table-cell workflows-table-cell-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleSelectItem(item.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="workflows-checkbox"
                  />
                </div>
                <div className="workflows-table-cell workflows-table-cell-name">
                  <div className="workflows-table-name-content">
                    {getTypeIcon(item.type)}
                    <span className="workflows-table-name-text">{item.name}</span>
                    {item.itemCount !== undefined && (
                      <span className="workflows-table-count-badge">
                        <span>{item.itemCount}</span>
                      </span>
                    )}
                    {item.badge && (
                      <span className={cn('workflows-table-badge', getBadgeClasses(item.badge.variant))}>
                        {item.badge.label}
                      </span>
                    )}
                    {item.linkedItem && (
                      <span
                        className="workflows-table-badge workflows-table-badge-link bg-info-100 text-info-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getTypeIcon(item.linkedItem.type, 14, 'text-info-500')}
                        <span className="workflows-table-badge-link-text">{item.linkedItem.label}</span>
                      </span>
                    )}
                  </div>
                  {(isHovered || isSelected) && (
                    <div className="workflows-table-row-actions">
                      <button
                        className="workflows-table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onItemEdit?.(item)
                        }}
                      >
                        <IconPencil size={18} stroke={1.5} />
                      </button>
                      <button
                        className="workflows-table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onItemMenu?.(item)
                        }}
                      >
                        <IconDotsVertical size={18} stroke={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="workflows-table-cell workflows-table-cell-type">
                  <span>{getTypeLabel(item.type)}</span>
                </div>
                {showLanguageColumn && (
                  <div className="workflows-table-cell workflows-table-cell-language">
                    <span>{item.language ?? '—'}</span>
                  </div>
                )}
                <div className="workflows-table-cell workflows-table-cell-created">
                  <span>{item.createdBy ?? '—'}</span>
                </div>
                <div className="workflows-table-cell workflows-table-cell-updated">
                  <span>{item.lastUpdatedOn ?? '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {/* Pagination — rendered outside the table's bordered card */}
      <div className="workflows-pagination">
        <div className="workflows-pagination-info">
          Rows <strong>{startRow}-{endRow}</strong> of <strong>{totalItems}</strong>
        </div>
        <div className="workflows-pagination-controls">
          <button
            className="workflows-pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <IconChevronLeft size={16} stroke={2} />
          </button>
          <div className="workflows-pagination-pages">
            {renderPaginationPages().map((page, index) => (
              <button
                key={index}
                className={cn(
                  'workflows-pagination-page',
                  typeof page === 'number' && page === currentPage && 'workflows-pagination-page-active'
                )}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={typeof page !== 'number'}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            className="workflows-pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <IconChevronRight size={16} stroke={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
