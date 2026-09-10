import React from 'react';
import Command from '../../../components/ui/Command';
import CommandSearch from './CommandSearch';
import CommandGroup from './CommandGroup';

export default function CommandCenter({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70">
      <div className="w-full max-w-xl">
        <Command>
          <CommandSearch />
          <CommandGroup title="Quick Actions" />
        </Command>
      </div>
    </div>
  );
}
