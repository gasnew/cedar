import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import download from './src/functions';

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this usage guide.',
  },
  {
    name: 'roomId',
    alias: 'r',
    type: String,
    defaultOption: true,
    description: 'The room ID.',
  },
  {
    name: 'outputFolder',
    alias: 'o',
    type: String,
    defaultValue: 'recordings',
    description: 'The output folder.',
  },
  {
    name: 'apiUrl',
    alias: 'u',
    type: String,
    defaultValue: 'http://localhost:3030',
    description: 'The Cedar API URL.',
  },
];

const options = commandLineArgs(optionDefinitions);

if (options.help) {
  const usage = commandLineUsage([
    {
      header: 'Typical Example',
      content: `yarn download abc-123 -o my-recordings`,
    },
    {
      header: 'Options',
      optionList: optionDefinitions,
    },
  ]);
  console.log(usage);
} else {
  download(options);
}
