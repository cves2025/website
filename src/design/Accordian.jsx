import React from 'react'

function Accordian({fileModules, title, open, onToggle}) {
  const [txtContents, setTxtContents] = React.useState({});

  // Convert to array of objects with name, url, and type
  const files = Object.entries(fileModules).map(([path, module]) => {
    const fileName = path.split('/').pop();
    const ext = fileName.split('.').pop().toLowerCase();
    return {
      name: fileName.replace(/\.(pdf|txt)$/i, ''),
      url: module.default,
      type: ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'txt' : 'other',
    };
  });

  // Fetch text content for txt files when accordion is opened
  React.useEffect(() => {
    if (open) {
      files.forEach(file => {
        if (file.type === 'txt' && !txtContents[file.url]) {
          fetch(file.url)
            .then(res => res.text())
            .then(text => {
              setTxtContents(prev => ({ ...prev, [file.url]: text }));
            });
        }
      });
    }
    // eslint-disable-next-line
  }, [open]);

  // Define desired custom order
  const customOrder = ['Nur', 'LKG', 'UKG', '1', '2', '3', '4', '5']; // extend as needed

  // Sort based on custom order
  files.sort((a, b) => {
    const aIndex = customOrder.indexOf(a.name);
    const bIndex = customOrder.indexOf(b.name);
    // Put unknowns at the end
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="rounded-lg shadow">
        <button
          className="w-full flex justify-between items-center px-4 py-3 text-lg font-semibold bg-gray-100 hover:bg-gray-200 focus:outline-none"
          onClick={onToggle}
        >
          <span>{title}</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="px-4 py-3 bg-white border-t">
            {files.map((file, index) => (
              file.type === 'pdf' ? (
                <a
                  key={index}
                  href={file.url}
                  download
                  className="flex items-center gap-2 mb-2 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 hover:text-blue-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                  {file.name}
                </a>
              ) : file.type === 'txt' ? (
                <pre
                  key={index}
                  className="mb-2 px-4 py-2 bg-green-50 text-green-700 rounded whitespace-pre-wrap border border-green-200"
                >
                  {txtContents[file.url] || 'Loading...'}
                </pre>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Accordian