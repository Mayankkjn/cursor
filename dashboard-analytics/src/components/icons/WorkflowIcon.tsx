interface WorkflowIconProps {
  size?: number
  stroke?: number
  className?: string
}

/**
 * Custom "workflow" glyph (two mirrored page panels), matching the icon
 * used for Workflow-type rows across the Mirror content surfaces.
 * Mirrors the @tabler/icons-react component signature (size/stroke/className)
 * so it drops into the same call sites as a tabler icon.
 */
export function WorkflowIcon({ size = 24, stroke = 2, className }: WorkflowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.4075 3.00891L7.69321 4.53791C7.77835 4.56819 7.85625 4.67419 7.91261 4.83643C7.96897 4.99867 8 5.20625 8 5.42105V14.579C8 14.7937 7.96897 15.0013 7.91261 15.1636C7.85625 15.3258 7.77835 15.4318 7.69321 15.4621L3.4075 16.9911C3.35686 17.0091 3.30525 16.9997 3.25618 16.9636C3.20711 16.9275 3.16172 16.8655 3.12309 16.7817C3.08445 16.698 3.05346 16.5945 3.03223 16.4782C3.01099 16.362 3 16.2357 3 16.1079V3.89205C3 3.76428 3.01099 3.63799 3.03223 3.52175C3.05346 3.4055 3.08445 3.30201 3.12309 3.21827C3.16172 3.13453 3.20711 3.07251 3.25618 3.03638C3.30525 3.00026 3.35686 2.9909 3.4075 3.00891Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5925 3.00891L12.3068 4.53791C12.2216 4.56819 12.1437 4.67419 12.0874 4.83643C12.031 4.99867 12 5.20625 12 5.42105V14.579C12 14.7937 12.031 15.0013 12.0874 15.1636C12.1437 15.3258 12.2216 15.4318 12.3068 15.4621L16.5925 16.9911C16.6431 17.0091 16.6947 16.9997 16.7438 16.9636C16.7929 16.9275 16.8383 16.8655 16.8769 16.7817C16.9156 16.698 16.9465 16.5945 16.9678 16.4782C16.989 16.362 17 16.2357 17 16.1079V3.89205C17 3.76428 16.989 3.63799 16.9678 3.52175C16.9465 3.4055 16.9156 3.30201 16.8769 3.21827C16.8383 3.13453 16.7929 3.07251 16.7438 3.03638C16.6947 3.00026 16.6431 2.9909 16.5925 3.00891Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
