// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626Fees} from "./ERC4626Fees.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CorporateVault is ERC4626Fees, Ownable {
    // === Custom errors ===
    error InvalidAddress();
    error FeeTooHigh(uint256 requested, uint256 max);

    // === Events ===
    event EntryFeeUpdated(uint256 newFeeBp);
    event ExitFeeUpdated(uint256 newFeeBp);
    event FeeRecipientUpdated(address newRecipient);

    uint256 private entryFeeBp;
    uint256 private exitFeeBp;
    address private feeRecipient;

    constructor(
        address asset_,
        string memory name_,
        string memory symbol_,
        address feeRecipient_,
        uint256 entryFeeBp_,
        uint256 exitFeeBp_
    ) ERC4626(IERC20(asset_)) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (asset_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (entryFeeBp_ > 1000) revert FeeTooHigh(entryFeeBp_, 1000);
        if (exitFeeBp_ > 1000) revert FeeTooHigh(exitFeeBp_, 1000);

        feeRecipient = feeRecipient_;
        entryFeeBp = entryFeeBp_;
        exitFeeBp = exitFeeBp_;
    }

    // === Admin functions ===

    function setEntryFeeBp(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooHigh(newFee, 1000);
        entryFeeBp = newFee;
        emit EntryFeeUpdated(newFee);
    }

    function setExitFeeBp(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooHigh(newFee, 1000);
        exitFeeBp = newFee;
        emit ExitFeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    // === Overrides from ERC4626Fees ===

    function _entryFeeBasisPoints() internal view override returns (uint256) {
        return entryFeeBp;
    }

    function _exitFeeBasisPoints() internal view override returns (uint256) {
        return exitFeeBp;
    }

    function _entryFeeRecipient() internal view override returns (address) {
        return feeRecipient;
    }

    function _exitFeeRecipient() internal view override returns (address) {
        return feeRecipient;
    }
}
