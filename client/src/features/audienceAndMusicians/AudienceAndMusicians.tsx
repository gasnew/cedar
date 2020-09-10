import {
  Button,
  Card,
  Classes,
  Colors,
  Dialog,
  Divider,
  FormGroup,
  H4,
  H5,
  InputGroup,
  ControlGroup,
} from '@blueprintjs/core';
import _ from 'lodash';
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

//import './AudienceAndMusicians.css';

const TEST_DATA = {
  columns: {
    audience: {
      id: 'audience',
      title: 'Audience',
      items: [
        {
          id: 'id:abc',
          name: 'Garrett',
        },
        {
          id: 'id:def',
          name: 'Jesse',
        },
      ],
    },
    musicians: {
      id: 'musicians',
      title: 'Musicians',
      items: [
        {
          id: 'id:123',
          name: 'Calob',
        },
        {
          id: 'id:456',
          name: 'Isaac',
        },
        {
          id: 'id:789',
          name: 'Molly',
        },
      ],
    },
  },
  columnOrder: ['audience', 'musicians'],
};

export default function() {
  const [listsState, setListsState] = useState(TEST_DATA);

  function onDragEnd(result) {
    if (!result.destination) {
      return;
    }

    // reordering in same list
    if (result.source.droppableId === result.destination.droppableId) {
      const column = listsState.columns[result.source.droppableId];
      const items = reorderList(
        column.items,
        result.source.index,
        result.destination.index
      );

      // updating column entry
      const newState = {
        ...listsState,
        columns: {
          ...listsState.columns,
          [column.id]: {
            ...column,
            items,
          },
        },
      };
      setListsState(newState);
      return;
    }

    // moving between lists
    const sourceColumn = listsState.columns[result.source.droppableId];
    const destinationColumn =
      listsState.columns[result.destination.droppableId];
    const item = sourceColumn.items[result.source.index];

    // 1. remove item from source column
    const newSourceColumn = {
      ...sourceColumn,
      items: [...sourceColumn.items],
    };
    newSourceColumn.items.splice(result.source.index, 1);

    // 2. insert into destination column
    const newDestinationColumn = {
      ...destinationColumn,
      items: [...destinationColumn.items],
    };
    // in line modification of items
    newDestinationColumn.items.splice(result.destination.index, 0, item);

    const newState = {
      ...listsState,
      columns: {
        ...listsState.columns,
        [newSourceColumn.id]: newSourceColumn,
        [newDestinationColumn.id]: newDestinationColumn,
      },
    };

    setListsState(newState);
  }

  return (
    <Card>
      <H4>Da Cedar House</H4>
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <Card
            elevation={2}
            style={{
              width: 180,
              marginRight: 8,
              padding: 0,
              backgroundColor: Colors.DARK_GRAY5,
            }}
          >
            <H5
              style={{
                padding: 10,
                margin: 0,
                backgroundColor: Colors.DARK_GRAY3,
              }}
            >
              Musicians
            </H5>
            <div
              style={{
                padding: 15,
                boxShadow:
                  'inset 0 1px 1px rgba(16, 22, 26, 0.4), inset 0 5px 6px rgba(16, 22, 26, 0.4)',
              }}
            >
              <PersonList column={listsState.columns.musicians} />
            </div>
          </Card>
          <Card
            elevation={2}
            style={{
              width: 180,
              marginRight: 8,
              padding: 0,
              backgroundColor: Colors.DARK_GRAY5,
            }}
          >
            <H5
              style={{
                padding: 10,
                margin: 0,
                backgroundColor: Colors.DARK_GRAY3,
              }}
            >
              Audience
            </H5>
            <div
              style={{
                padding: 15,
                boxShadow:
                  'inset 0 1px 1px rgba(16, 22, 26, 0.4), inset 0 5px 6px rgba(16, 22, 26, 0.4)',
              }}
            >
              <PersonList column={listsState.columns.audience} />
            </div>
          </Card>
        </div>
      </DragDropContext>
    </Card>
  );
}

function getStyle({ draggableStyle, virtualStyle, isDragging }) {
  // If you don't want any spacing between your items
  // then you could just return this.
  // I do a little bit of magic to have some nice visual space
  // between the row items
  const combined = {
    ...virtualStyle,
    ...draggableStyle,
  };

  // Being lazy: this is defined in our css file
  const grid = 8;

  // when dragging we want to use the draggable style for placement, otherwise use the virtual style
  const result = {
    ...combined,
    width: isDragging
      ? draggableStyle.width
      : `calc(${combined.width} - ${grid * 2}px)`,
    marginBottom: grid,
    ...(isDragging
      ? {
          backgroundColor: 'rgba(167, 182, 194, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.4)',
        }
      : {}),
  };

  return result;
}

function Person({ provided, item, style, isDragging }) {
  console.log(provided.dragHandleProps);
  return (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      style={{
        ...getStyle({
          draggableStyle: provided.draggableProps.style,
          virtualStyle: style,
          isDragging,
        }),
        color: '#f5f8fa',
      }}
      className="bp3-button bp3-outlined"
    >
      {item.name}
    </div>
  );
}

function PersonList({ column }) {
  return (
    <Droppable
      droppableId={column.id}
      renderClone={(provided, snapshot, rubric) => (
        <Person
          provided={provided}
          isDragging={snapshot.isDragging}
          item={column.items[rubric.source.index]}
          style={{ left: 8 }}
        />
      )}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          style={{ display: 'flex', flexDirection: 'column', height: 300 }}
        >
          {_.map(column.items, (item, index) => (
            <Draggable draggableId={item.id} index={index} key={item.id}>
              {provided => (
                <Person
                  provided={provided}
                  item={item}
                  style={{ left: 8 }}
                  isDragging={false}
                />
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export function reorderList(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}
