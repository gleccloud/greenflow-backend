/**
 * Documentation Page - Tab-based API documentation hub
 * Tabs: Quick Start, API Reference, Code Examples
 */

import { useState } from 'react';
import { Rocket, Book, Code2 } from 'lucide-react';
import { QuickStartTab } from '../components/docs/QuickStartTab';
import { ApiReferenceTab } from '../components/docs/ApiReferenceTab';
import { CodeExamplesTab } from '../components/docs/CodeExamplesTab';

type DocTab = 'quickstart' | 'reference' | 'examples';

const TABS = [
  { id: 'quickstart' as const, label: 'Quick Start', icon: Rocket },
  { id: 'reference' as const, label: 'API Reference', icon: Book },
  { id: 'examples' as const, label: 'Code Examples', icon: Code2 },
];

export function Documentation() {
  const [activeTab, setActiveTab] = useState<DocTab>('quickstart');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">API Documentation</h1>
        <p className="text-slate-600 mt-2">
          Everything you need to integrate with GreenFlow API v2.0
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'quickstart' && <QuickStartTab />}
      {activeTab === 'reference' && <ApiReferenceTab />}
      {activeTab === 'examples' && <CodeExamplesTab />}
    </div>
  );
}
