import fetchURL from "../../utils/fetchURL";
import { getUniqStartOfTodayTimestamp } from "../../helpers/getUniSubgraphVolume";
import { CHAIN } from "../../helpers/chains";

const chains = [CHAIN.AVAX];

const chainMap: Record<string, string> = {
  [CHAIN.AVAX]: "avalanche_c",
};
const NAME = "yield_yak";

const fetch = (chain: string) => async (timestamp: number) => {
  const unixTimestamp = getUniqStartOfTodayTimestamp(
    new Date(timestamp * 1000)
  );

  try {
    const data = (
      await fetchURL(
        `https://api.dune.com/api/v1/query/3289587/results?api_key=R0n7PWCs1hw6O6nvQrmJPGTIUZKKn2zz`
      )
    ).data?.result?.rows;

    const dayData = data.find(
      ({
        block_date,
        blockchain,
        project,
      }: {
        block_date: number;
        blockchain: string;
        project: string;
      }) =>
        getUniqStartOfTodayTimestamp(new Date(block_date)) === unixTimestamp &&
        blockchain === (chainMap[chain] || chain) &&
        project === NAME
    );

    return {
      dailyVolume: dayData?.trade_amount ?? "0",
      timestamp: unixTimestamp,
    };
  } catch (e) {
    return {
      dailyVolume: "0",
      timestamp: unixTimestamp,
    };
  }
};

const adapter: any = {
  adapter: {
    ...chains.reduce((acc, chain) => {
      return {
        ...acc,
        [chain]: {
          fetch: fetch(chain),
          start: async () => 1685491200,
        },
      };
    }, {}),
  },
};

export default adapter;
