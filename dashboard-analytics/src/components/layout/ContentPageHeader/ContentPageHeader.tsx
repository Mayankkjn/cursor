import type { ReactNode } from 'react'
import {
  IconChevronDown,
  IconFolderPlus,
  IconSearch,
  IconAdjustmentsHorizontal,
  IconLayoutGrid,
  IconBoxAlignTopRight,
  IconX,
} from '@tabler/icons-react'
import { cn } from '../../../lib/utils'
import { TabGroup } from '../../ui'

interface ActionButton {
  label: string
  icon?: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'text'
}

export interface SelectionBarAction {
  label: string
  icon?: ReactNode
  onClick?: () => void
  /** Renders the action in the critical/red treatment (e.g. "Delete") */
  variant?: 'default' | 'danger'
}

export interface SelectionBarConfig {
  count: number
  onClear: () => void
  actions: SelectionBarAction[]
}

interface ContentPageHeaderProps {
  title: string
  showCreateButton?: boolean
  createButtonLabel?: string
  createButtonIcon?: ReactNode
  onCreateClick?: () => void
  tabs?: { id: string; label: string }[]
  defaultTabId?: string
  onTabChange?: (tabId: string) => void
  showSearch?: boolean
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  showFilter?: boolean
  onFilterClick?: () => void
  showViewToggle?: boolean
  showCreateFolder?: boolean
  onCreateFolderClick?: () => void
  /** Primary action button shown in actions area (e.g., "Create simulation") */
  primaryAction?: ActionButton
  /** When set, renders a contextual bulk-selection toolbar as its own row below the tabs */
  selectionBar?: SelectionBarConfig
}

/**
 * ContentPageHeader Component
 */
export function ContentPageHeader({
  title,
  showCreateButton = true,
  createButtonLabel = 'Create content',
  createButtonIcon,
  onCreateClick,
  tabs,
  defaultTabId,
  onTabChange,
  showSearch = true,
  searchPlaceholder = 'Search content',
  onSearchChange,
  showFilter = true,
  onFilterClick,
  showViewToggle = true,
  showCreateFolder = true,
  onCreateFolderClick,
  primaryAction,
  selectionBar,
}: ContentPageHeaderProps) {
  return (
    <div className="content-page-header">
      {/* Top row: Title only (no create button at top for cleaner look) */}
      <div className="content-page-header-top">
        <h1 className="content-page-header-title">{title}</h1>
        {showCreateButton && !primaryAction && (
          <button className="content-page-header-create-btn" onClick={onCreateClick}>
            {createButtonIcon}
            {createButtonLabel}
            <IconChevronDown size={16} stroke={2} />
          </button>
        )}
      </div>

      {/* Bottom row: Tabs and actions */}
      <div className="content-page-header-bottom">
        <div className="content-page-header-tabs">
          {tabs && (
            <TabGroup
              tabs={tabs}
              defaultActiveId={defaultTabId}
              onChange={onTabChange}
            />
          )}
        </div>

        <div className="content-page-header-actions">
          {/* Primary action button (e.g., Create simulation) */}
          {primaryAction && (
            <button 
              className="content-page-header-action-btn" 
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon || <IconBoxAlignTopRight size={20} stroke={2} />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {/* Create folder */}
          {showCreateFolder && !primaryAction && (
            <button className="content-page-header-action-btn" onClick={onCreateFolderClick}>
              <IconFolderPlus size={20} stroke={2} />
              <span>Create folder</span>
            </button>
          )}

          {showSearch && (
            <div className="content-page-header-search">
              <IconSearch size={18} stroke={1.5} />
              <input 
                type="text" 
                placeholder={searchPlaceholder}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          )}

          {showFilter && (
            <button className="content-page-header-filter-btn" onClick={onFilterClick}>
              <IconAdjustmentsHorizontal size={18} stroke={1.5} />
              <span>Filter</span>
            </button>
          )}

          {showViewToggle && (
            <button className="content-page-header-icon-btn">
              <IconLayoutGrid size={18} stroke={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Selection row: contextual bulk-action toolbar, shown below the tabs while rows are selected */}
      {selectionBar && (
        <div className="content-page-header-selection-row">
          <span className="selection-bar-count">
            {selectionBar.count} selected
            <button className="selection-bar-clear" onClick={selectionBar.onClear}>
              <IconX size={14} stroke={2} />
            </button>
          </span>
          {selectionBar.actions.map((action) => (
            <button
              key={action.label}
              className={cn(
                'selection-bar-action',
                action.variant === 'danger' && 'selection-bar-action-danger'
              )}
              onClick={action.onClick}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
