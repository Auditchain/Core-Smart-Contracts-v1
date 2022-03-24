pragma solidity =0.8.0;
// SPDX-License-Identifier: MIT



/**
 * @title LinkedList
 * @dev Data structure
 * @author Alberto Cuesta Cañada
 */
contract LinkedList {

    event ObjectCreated(uint256 id, uint256 price, bytes32 validationHash);
    event ObjectsLinked(uint256 prev, uint256 next);
    event ObjectRemoved(uint256 id);
    event NewHead(uint256 id);

    struct Object{
        uint256 id;
        uint256 next;
        uint256 price;
        bytes32 validationHash;
    }

    uint256 public head;
    uint256 public idCounter;
    mapping (uint256 => Object) public objects;

    /**
     * @dev Creates an empty list.
     */
    constructor() {
        head = 0;
        idCounter = 1;
    }

    /**
     * @dev Retrieves the Object denoted by `_id`.
     */
    function get(uint256 _id)
        public
        virtual
        view
        returns (uint256, uint256, uint256, bytes32)
    {
        Object memory object = objects[_id];
        return (object.id, object.next, object.price, object.validationHash);
    }

    /**
     * @dev Given an Object, denoted by `_id`, returns the id of the Object that points to it, or 0 if `_id` refers to the Head.
     */
    function findPrevId(uint256 _id)
        public
        virtual
        view
        returns (uint256)
    {
        if (_id == head) return 0;
        Object memory prevObject = objects[head];
        while (prevObject.next != _id) {
            prevObject = objects[prevObject.next];
        }
        return prevObject.id;
    }

    /**
     * @dev Returns the id for the Tail.
     */
    function findTailId()
        public
        virtual
        view
        returns (uint256)
    {
        Object memory oldTailObject = objects[head];
        while (oldTailObject.next != 0) {
            oldTailObject = objects[oldTailObject.next];    
        }
        return oldTailObject.id;
    }

    /**
     * @dev Return the id of the first Object matching `_price` in the data field.
     */
    function findIdForData(uint256 _price)
        public
        virtual
        view
        returns (uint256)
    {
        Object memory object = objects[head];
        while (object.price != _price) {
            object = objects[object.next];
        }
        return object.id;
    }

    function findIdForValidationHash(bytes32 _validationHash)public view returns (uint256) {
          Object memory object = objects[head];
            while (object.validationHash != _validationHash) {
                object = objects[object.next];
            }
            return object.id;
    }

    /**
     * @dev Return the id of the first Object matching `_price` in the data field.
     */
    function findIdForLesserPrice(uint256 _price)
        public
        virtual
        view
        returns (uint256)
    {
        Object memory object = objects[head];
        while (object.price >= _price) {
            object = objects[object.next];
        }
        return object.id;
    }

    /**
     * @dev Insert a new Object as the new Head with `_price` in the data field.
     */
    function addHead(uint256 _price, bytes32 _validationHash)
        public
        virtual
    {
        uint256 objectId = _createObject(_price, _validationHash);
        _link(objectId, head);
        _setHead(objectId);
    }

    /**
     * @dev Insert a new Object as the new Tail with `_price` in the data field.
     */
    function addTail(uint256 _price, bytes32 _validationHash)
        public
        virtual
    {
        if (head == 0) {
            addHead(_price, _validationHash);
        }
        else {
            uint256 oldTailId = findTailId();
            uint256 newTailId = _createObject(_price, _validationHash);
            _link(oldTailId, newTailId);
        }
    }

    /**
     * @dev Remove the Object denoted by `_id` from the List.
     */
    function remove(uint256 _id)
        public
        virtual
    {
        Object memory removeObject = objects[_id];
        if (head == _id) {
            _setHead(removeObject.next);
        }
        else {
            uint256 prevObjectId = findPrevId(_id);
            _link(prevObjectId, removeObject.next);
        }
        delete objects[removeObject.id];
        emit ObjectRemoved(_id);
    }

    /**
     * @dev Insert a new Object after the Object denoted by `_id` with `_price` in the data field.
     */
    function insertAfter(uint256 _prevId, uint256 _price, bytes32 validationHash)
        public
        virtual
    {
        Object memory prevObject = objects[_prevId];
        uint256 newObjectId = _createObject(_price, validationHash);
        _link(newObjectId, prevObject.next);
        _link(prevObject.id, newObjectId);
    }

    /**
     * @dev Insert a new Object before the Object denoted by `_id` with `_price` in the data field.
     */
    function insertBefore(uint256 _nextId, uint256 _price, bytes32 validatioHash)
        public
        virtual
    {
        if (_nextId == head) {
            addHead(_price, validatioHash);
        }
        else {
            uint256 prevId = findPrevId(_nextId);
            insertAfter(prevId, _price, validatioHash);
        }
    }

    /**
     * @dev Internal function to update the Head pointer.
     */
    function _setHead(uint256 _id)
        internal
    {
        head = _id;
        emit NewHead(_id);
    }

    /**
     * @dev Internal function to create an unlinked Object.
     */
    function _createObject(uint256 _price, bytes32 _validationHash)
        internal
        returns (uint256)
    {
        uint256 newId = idCounter;
        idCounter += 1;
        Object memory object = Object(newId, 0, _price, _validationHash);
        objects[object.id] = object;
        emit ObjectCreated(
            object.id,
            object.price,
            object.validationHash
        );
        return object.id;
    }

    /**
     * @dev Internal function to link an Object to another.
     */
    function _link(uint256 _prevId, uint256 _nextId)
        internal
    {
        objects[_prevId].next = _nextId;
        emit ObjectsLinked(_prevId, _nextId);
    }


    function addToQueue(uint256 _price, bytes32 _validationHash) public {
        

       uint256 id = findIdForLesserPrice(_price);
       insertBefore(id, _price, _validationHash);

    }

    function getValidationToProcess(bytes32 _validationHash) public view returns (bytes32) {

        uint256 id = findIdForValidationHash(_validationHash);
        bytes32 transactionHash;


        if (id == 0){
            (,,,transactionHash) =   get(head);
        } else {

            uint256 prevId = findPrevId(id);
            (,,,transactionHash) =   get(prevId);
        }

        return transactionHash;
    }



    function removeFromQueue() public {


        remove(head);

    }


}