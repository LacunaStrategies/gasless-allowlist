const Quantity = ({max, mintQty, setMintQty}) => {

    const increment = () => {
        if (mintQty + 1 > max) {
            setMintQty(max)
        } else {
            setMintQty(mintQty + 1)
        }
    }

    const decrement = () => {
        if (mintQty -1 < 0 ) {
            setMintQty(0)
        } else {
            setMintQty(mintQty - 1)
        }
    }

    return (
        <div className="mb-4">
            <button
                className="bg-green-500 h-[25px] w-[25px] rounded-sm mr-5"
                onClick={decrement}
            >-</button>
            {mintQty}
            <button
                className="bg-green-500 h-[25px] w-[25px] rounded-sm ml-5"
                onClick={increment}
            >+</button>
        </div>
    );
}

export default Quantity;