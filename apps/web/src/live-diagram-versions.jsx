import React, { useEffect, useState } from 'react';

const prefixFor = (identity) => `${identity}-diagram-version-v1:`;
const timestamp = () =>
  new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
function readVersions(identity) {
  const prefix = prefixFor(identity);
  const versions = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const version = JSON.parse(localStorage.getItem(key));
    if (
      !version ||
      typeof version.text !== 'string' ||
      typeof version.name !== 'string' ||
      typeof version.created !== 'number'
    )
      throw Error(
        'Saved versions could not be read. Existing browser data has been left untouched.',
      );
    versions.push({ ...version, key });
  }
  return versions.sort((a, b) => b.created - a.created || a.key.localeCompare(b.key));
}
function appendVersion(identity, text, name) {
  // Separate keys make appends in other browser tabs independent: no array overwrite.
  const key = `${prefixFor(identity)}${crypto.randomUUID()}`;
  const version = { text, name, created: Date.now() };
  localStorage.setItem(key, JSON.stringify(version));
  return { ...version, key };
}
export function LiveDiagramVersions({ identity, text, source, onReplace, valid }) {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  function refresh() {
    try {
      setVersions(readVersions(identity));
      setError('');
    } catch (e) {
      setError(e.message || 'This browser could not read saved versions.');
    }
  }
  useEffect(() => {
    refresh();
    function changed(event) {
      if (!event.key || event.key.startsWith(prefixFor(identity))) refresh();
    }
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [identity]);
  function save() {
    try {
      const version = appendVersion(
        identity,
        text,
        name.trim() || `Version · ${timestamp()}`,
      );
      refresh();
      setSelected(version.key);
      setName('');
      setNotice(`Saved “${version.name}” in this browser.`);
    } catch (e) {
      setError(
        `Could not save version. ${e.message || 'Browser storage is unavailable.'}`,
      );
    }
  }
  function replace(value, label) {
    try {
      const latest = readVersions(identity);
      let recovered = false;
      if (
        text !== value &&
        text !== source &&
        !latest.some((version) => version.text === text)
      ) {
        appendVersion(identity, text, `Draft before ${label} · ${timestamp()}`);
        recovered = true;
      }
      refresh();
      onReplace(value);
      setNotice(
        `${label === 'reset' ? 'Original restored' : 'Version restored'}. ${recovered ? 'Previous draft saved in the version list.' : 'Saved versions kept.'}`,
      );
    } catch (e) {
      setError(
        `Draft kept; nothing replaced. ${e.message || 'Browser storage is unavailable.'}`,
      );
    }
  }
  return (
    <div className="diagram-versions">
      <div className="version-row">
        <input
          aria-label="Version name (optional)"
          placeholder="Version name (optional)"
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button disabled={!valid} onClick={save}>
          Save version
        </button>
      </div>
      {versions.length > 0 && (
        <div className="version-row">
          <select
            aria-label="Browser-local diagram versions"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose a saved version ({versions.length})</option>
            {versions.map((version) => (
              <option key={version.key} value={version.key}>
                {version.name} — {new Date(version.created).toLocaleTimeString()}
              </option>
            ))}
          </select>
          <button
            disabled={!versions.some((version) => version.key === selected)}
            onClick={() => {
              const version = versions.find((item) => item.key === selected);
              if (version) replace(version.text, 'restore');
            }}
          >
            Restore version
          </button>
        </div>
      )}
      <button onClick={() => replace(source, 'reset')}>Reset original</button>
      <p className="small" role="status">
        {error ||
          notice ||
          'Versions are browser-local. Restore and reset keep an unsaved draft as a recovery version.'}
      </p>
    </div>
  );
}
