'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { museum } from '../nav/api'
import { ROOM_JUMP_ORDER, roomJumpLabel } from '../nav/targets'

/**
 * Room jump menu following the WAI-ARIA menu button pattern: Enter, Space or
 * the arrow keys open it with focus on an item; arrows, Home and End move;
 * Escape closes and returns focus to the button.
 */
export function NavigateMenu({ zoneKey }: { zoneKey: string }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState<'current' | 'first' | 'last'>('current')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const menuId = useId()

  const items = (): HTMLButtonElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])

  useEffect(() => {
    if (!open) return
    const list = items()
    const here = list.findIndex((el) => el.getAttribute('aria-current') === 'location')
    const index = start === 'first' ? 0 : start === 'last' ? list.length - 1 : Math.max(0, here)
    list[index]?.focus()
  }, [open, start])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setStart(event.key === 'ArrowUp' ? 'last' : 'first')
      setOpen(true)
    }
  }

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    const move = (to: number) => {
      event.preventDefault()
      list[(to + list.length) % list.length]?.focus()
    }
    switch (event.key) {
      case 'ArrowDown':
        move(index + 1)
        break
      case 'ArrowUp':
        move(index - 1)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(list.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

  return (
    <div className="museum-nav" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn--glass"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setStart('current')
          setOpen((v) => !v)
        }}
        onKeyDown={onButtonKey}
      >
        Navigate
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul id={menuId} ref={menuRef} className="museum-nav-menu" role="menu" aria-label="Jump to room" onKeyDown={onMenuKey}>
          {ROOM_JUMP_ORDER.map((key) => (
            <li key={key} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="museum-nav-item"
                aria-current={key === zoneKey ? 'location' : undefined}
                onClick={() => {
                  museum.goRoom(key)
                  close(true)
                }}
              >
                {roomJumpLabel(key)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
