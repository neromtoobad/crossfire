// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal IERC20 surface used by this contract — no SafeERC20, no
///         OpenZeppelin dependency on purpose to keep audit surface tiny.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title  BinaryMarket — a minimal YES/NO prediction market with USDC collateral.
/// @notice 1 USDC = 1 share of the chosen side. No price impact, no slippage,
///         no LMSR — just a safe bookkeeping primitive that lets adversarial
///         agents place bets that the chain can settle and judges can read.
///         Implied probability is `totalYes / (totalYes + totalNo)`.
contract BinaryMarket {
    IERC20 public immutable usdc;
    string public question;
    uint256 public immutable closeTime;

    uint256 public totalYesShares;
    uint256 public totalNoShares;
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    /// Cumulative USDC balance already credited to positions. Anything above
    /// this in `usdc.balanceOf(this)` is unclaimed and available for the next
    /// `buyOnBehalf` call.
    uint256 public lastSettledBalance;

    event Buy(address indexed buyer, bool isYes, uint256 usdcAmount, uint256 sharesOut);
    event BuyOnBehalf(address indexed buyer, bool isYes, uint256 usdcAmount, uint256 sharesOut);

    error MarketClosed();
    error ZeroAmount();
    error UsdcTransferFailed();
    error InsufficientFreshDeposit(uint256 fresh, uint256 needed);

    constructor(address _usdc, string memory _question, uint256 _closeTime) {
        usdc = IERC20(_usdc);
        question = _question;
        closeTime = _closeTime;
    }

    /// @notice Buy YES or NO shares with USDC. Caller must have approved
    ///         `usdcAmount` USDC to this contract beforehand.
    function buy(bool isYes, uint256 usdcAmount) external returns (uint256 sharesOut) {
        if (block.timestamp >= closeTime) revert MarketClosed();
        if (usdcAmount == 0) revert ZeroAmount();

        // Pull USDC from the buyer. CROSSFIRE's redelegation chain handles
        // authorization upstream — we just need the transferFrom to succeed.
        bool ok = usdc.transferFrom(msg.sender, address(this), usdcAmount);
        if (!ok) revert UsdcTransferFailed();

        // 1:1 share accounting — simple, safe, and gives a clean impliedProb.
        sharesOut = usdcAmount;
        if (isYes) {
            yesShares[msg.sender] += sharesOut;
            totalYesShares += sharesOut;
        } else {
            noShares[msg.sender] += sharesOut;
            totalNoShares += sharesOut;
        }

        // Direct buys also count toward the settled balance so a later
        // buyOnBehalf only claims fresh USDC.
        lastSettledBalance += usdcAmount;
        emit Buy(msg.sender, isYes, usdcAmount, sharesOut);
    }

    /// @notice Credit `buyer`'s position using USDC that has already arrived
    ///         at this market via a separate USDC.transfer. The chain pattern
    ///         CROSSFIRE uses:
    ///           (1) Through the delegation chain: USDC.transfer(market, amount)
    ///               — allowed by the root mandate's Erc20TransferAmount scope.
    ///           (2) Permissionless call: market.buyOnBehalf(buyer, isYes, amount)
    ///               — credits shares without needing a delegation, because the
    ///               USDC is already in the contract.
    ///
    ///         Anyone can call this — what matters is the fresh-deposit check.
    function buyOnBehalf(address buyer, bool isYes, uint256 amount)
        external
        returns (uint256 sharesOut)
    {
        if (block.timestamp >= closeTime) revert MarketClosed();
        if (amount == 0) revert ZeroAmount();

        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 fresh = currentBalance - lastSettledBalance;
        if (fresh < amount) revert InsufficientFreshDeposit(fresh, amount);

        lastSettledBalance += amount;
        sharesOut = amount;

        if (isYes) {
            yesShares[buyer] += sharesOut;
            totalYesShares += sharesOut;
        } else {
            noShares[buyer] += sharesOut;
            totalNoShares += sharesOut;
        }

        emit BuyOnBehalf(buyer, isYes, amount, sharesOut);
    }

    /// @notice Returns (yesShares, noShares) held by `user`.
    function positionOf(address user) external view returns (uint256 yes, uint256 no) {
        return (yesShares[user], noShares[user]);
    }

    /// @notice Returns (totalYes, totalNo) shares outstanding across all buyers.
    function totals() external view returns (uint256 totalYes, uint256 totalNo) {
        return (totalYesShares, totalNoShares);
    }

    /// @notice Implied P(YES), scaled by 1e18. Returns 0.5e18 when no shares
    ///         have been bought yet (uniform prior).
    function impliedProbYes() external view returns (uint256) {
        uint256 t = totalYesShares + totalNoShares;
        if (t == 0) return 0.5e18;
        return (totalYesShares * 1e18) / t;
    }
}
