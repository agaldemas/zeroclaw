import { Settings, Save, CheckCircle, AlertTriangle, ShieldAlert, FileCode, List, Server } from 'lucide-react';
import { useConfigForm } from '@/components/config/useConfigForm';
import ConfigFormEditor from '@/components/config/ConfigFormEditor';

export default function Config() {
  const {
    loading, saving, error, success, mode, rawToml, mcpServers,
    setMode, setFieldValue, getFieldValue, isFieldMasked, setRawToml, save
  } = useConfigForm();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white">Configuration</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 p-1">
            <button
              onClick={() => setMode('form')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'form' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />Form
            </button>
            <button
              onClick={() => setMode('raw')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'raw' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileCode className="h-4 w-4" />Raw
            </button>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Sensitive fields note */}
      <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-4">
        <ShieldAlert className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-yellow-300 font-medium">Sensitive fields are masked</p>
          <p className="text-sm text-yellow-400/70 mt-0.5">API keys, tokens, and passwords are hidden for security.</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg p-3">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-300">{success}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Config Editor */}
      {mode === 'form' ? (
        <div className="space-y-6">
          {/* Form Editor */}
          <ConfigFormEditor
            getFieldValue={getFieldValue}
            setFieldValue={setFieldValue}
            isFieldMasked={isFieldMasked}
            mcpServers={mcpServers}
          />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-800/50">
            <span className="text-xs text-gray-400 font-medium uppercase">TOML Configuration</span>
            <span className="text-xs text-gray-500">{rawToml.split('\n').length} lines</span>
          </div>
          <textarea
            value={rawToml}
            onChange={(e) => setRawToml(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[500px] bg-gray-950 text-gray-200 font-mono text-sm p-4 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}
