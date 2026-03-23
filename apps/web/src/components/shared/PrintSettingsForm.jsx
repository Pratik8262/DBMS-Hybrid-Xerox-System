/**
 * components/shared/PrintSettingsForm.jsx
 * Form for selecting print settings (color, paper, sides, copies, etc.)
 * Used in Upload/Checkout pages.
 */
import React from 'react'
import { Select, Input } from '../ui/Input'

const defaultSettings = {
  color_mode:  'bw',
  orientation: 'portrait',
  scaling:     'fit',
  sides:       'simplex',
  paper_size:  'A4',
  copies:      1,
}

export function PrintSettingsForm({ settings = defaultSettings, onChange, disabled = false }) {
  const update = (key) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
    onChange?.({ ...settings, [key]: val })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Color Mode"
        value={settings.color_mode}
        onChange={update('color_mode')}
        disabled={disabled}
      >
        <option value="bw">Black & White</option>
        <option value="color">Color</option>
        <option value="grayscale">Grayscale</option>
      </Select>

      <Select
        label="Paper Size"
        value={settings.paper_size}
        onChange={update('paper_size')}
        disabled={disabled}
      >
        <option value="A4">A4</option>
        <option value="A3">A3</option>
        <option value="Letter">Letter</option>
        <option value="Legal">Legal</option>
      </Select>

      <Select
        label="Print Sides"
        value={settings.sides}
        onChange={update('sides')}
        disabled={disabled}
      >
        <option value="simplex">Single-sided</option>
        <option value="duplex_long">Double-sided (Long edge)</option>
        <option value="duplex_short">Double-sided (Short edge)</option>
      </Select>

      <Select
        label="Orientation"
        value={settings.orientation}
        onChange={update('orientation')}
        disabled={disabled}
      >
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
      </Select>

      <Select
        label="Scaling"
        value={settings.scaling}
        onChange={update('scaling')}
        disabled={disabled}
      >
        <option value="fit">Fit to Page</option>
        <option value="fill">Fill Page</option>
        <option value="actual">Actual Size</option>
      </Select>

      <Input
        label="Copies"
        type="number"
        min={1}
        max={999}
        value={settings.copies}
        onChange={update('copies')}
        disabled={disabled}
      />
    </div>
  )
}

export { defaultSettings as defaultPrintSettings }
