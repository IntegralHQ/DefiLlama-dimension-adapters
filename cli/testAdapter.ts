require('dotenv').config()
import * as path from 'path'
import { Adapter, AdapterType, ChainBlocks, } from '../adapters/types';
import { checkArguments, ERROR_STRING, formatTimestampAsDate, printVolumes, upperCaseFirst } from './utils';
import { getUniqStartOfTodayTimestamp } from '../helpers/getUniSubgraphVolume';
import runAdapter from '../adapters/utils/runAdapter'
import { canGetBlock, getBlock } from '../helpers/getBlock';
import getChainsFromDexAdapter from '../adapters/utils/getChainsFromDexAdapter';

// tmp
const handleError = (e: Error) => console.error(e)

// Add handler to rejections/exceptions
process.on('unhandledRejection', handleError)
process.on('uncaughtException', handleError)

// Check if all arguments are present
checkArguments(process.argv)

// Get path of module import
const adapterType: AdapterType = process.argv[2] as AdapterType
const passedFile = path.resolve(process.cwd(), `./${adapterType}/${process.argv[3]}`);
(async () => {
  const cleanDayTimestamp = process.argv[4] ? getUniqStartOfTodayTimestamp(new Date(+process.argv[4] * 1000 + 60 * 60 * 24 * 1000)) : getUniqStartOfTodayTimestamp(new Date())
  const endCleanDayTimestamp = cleanDayTimestamp - 1
  console.info(`🦙 Running ${process.argv[3].toUpperCase()} adapter 🦙`)
  console.info(`_______________________________________`)
  // Import module to test
  let module: Adapter = (await import(passedFile)).default
  console.info(`${upperCaseFirst(adapterType)} for ${formatTimestampAsDate(String(getUniqStartOfTodayTimestamp(new Date(endCleanDayTimestamp * 1000))))}`)
  console.info(`_______________________________________\n`)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = getChainsFromDexAdapter(module).filter(canGetBlock)

  const chainBlocks: ChainBlocks = {};
  await Promise.all(allChains.map(async (chain) => {
    try {
      const latestBlock = await getBlock(endCleanDayTimestamp, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${endCleanDayTimestamp}, ${chain}`))
      if (latestBlock)
        chainBlocks[chain] = latestBlock
    } catch (e) { console.log(e) }
  }))

  if ("adapter" in module) {
    const adapter = module.adapter
    // Get adapter
    const volumes = await runAdapter(adapter, endCleanDayTimestamp, chainBlocks)
    printVolumes(volumes, adapter)
    console.info("\n")
  } else if ("breakdown" in module) {
    const breakdownAdapter = module.breakdown
    const allVolumes = await Promise.all(Object.entries(breakdownAdapter).map(([version, adapter]) =>
      runAdapter(adapter, cleanDayTimestamp, chainBlocks).then(res => ({ version, res }))
    ))
    allVolumes.forEach(({ version, res }) => {
      console.info("Version ->", version.toUpperCase())
      console.info("---------")
      printVolumes(res, breakdownAdapter[version])
    })
  } else throw new Error("No compatible adapter found")
  process.exit(0)
})()