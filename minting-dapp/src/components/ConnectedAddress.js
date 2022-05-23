import { shortAddress } from "../utils/helperFunctions";

const ConnectedAddress = ({currentAccount}) => {
    if (currentAccount === '')
        return <></>

    return ( 
        <div
            className="absolute top-5 right-5"
        >
            {shortAddress(currentAccount,5,-4)}
        </div>
     );
}
 
export default ConnectedAddress;