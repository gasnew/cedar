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
  Icon,
  InputGroup,
  ControlGroup,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import _ from 'lodash';
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useSelector } from 'react-redux';

import styles from './AudienceAndMusicians.module.css';
import { selectRecordingState } from '../recording/recordingSlice';

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
        {
          id: 'id:defa',
          name: 'Bob',
        },
        {
          id: 'id:efa',
          name: 'Bab',
        },
        {
          id: 'id:fa',
          name: 'Beb',
        },
        {
          id: 'id:dea',
          name: 'Bib',
        },
      ],
    },
  },
  columnOrder: ['audience', 'musicians'],
};
const MUSICIAN_COLORS = [
  Colors.VERMILION1,
  Colors.ROSE1,
  Colors.VIOLET1,
  Colors.INDIGO1,
  Colors.COBALT1,
  Colors.TURQUOISE1,
  Colors.FOREST1,
  Colors.LIME1,
];

export default function() {
  const [listsState, setListsState] = useState(TEST_DATA);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  const recordingState = useSelector(selectRecordingState);

  function onDragStart(start) {
    setDragSourceId(start.source.droppableId);
  }

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

  const musiciansColumn = listsState.columns.musicians;
  const audienceColumn = listsState.columns.audience;
  const musiciansLocked = recordingState !== 'stopped';

  return (
    <Card>
      <H4>Da Cedar House</H4>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <Card elevation={2} className={styles.listCard}>
            <H5
              style={{
                padding: 10,
                margin: 0,
                backgroundColor: Colors.DARK_GRAY3,
              }}
            >
              {musiciansLocked && (
                <Icon
                  icon={IconNames.LOCK}
                  iconSize={10}
                  style={{
                    position: 'relative',
                    bottom: 4,
                    right: 4,
                  }}
                />
              )}
              Musicians
            </H5>
            <div className={styles.listContainer}>
              <PersonList
                column={musiciansColumn}
                isDropDisabled={
                  (dragSourceId === audienceColumn.id &&
                    musiciansColumn.items.length === 8) ||
                  musiciansLocked
                }
                isDragDisabled={musiciansLocked}
              />
              <div className={styles.listHighlightsContainer}>
                {_.map(_.range(8), index => (
                  <div
                    key={index}
                    className={styles.listHighlight}
                    style={{
                      backgroundColor:
                        index % 2 ? Colors.DARK_GRAY5 : Colors.DARK_GRAY4,
                    }}
                  >
                    <span
                      className={styles.listHighlightIndex}
                      style={{
                        color: index % 2 ? Colors.GRAY2 : Colors.GRAY1,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card
            elevation={2}
            className={styles.listCard}
            style={{
              width: 180 - 12,
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
            <div className={styles.listContainer} style={{ paddingLeft: 4 }}>
              <PersonList
                column={audienceColumn}
                isDropDisabled={
                  dragSourceId === musiciansColumn.id &&
                  audienceColumn.items.length === 8
                }
              />
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
          // NOTE(gnewman): These colors were picked from what an outlined
          // activated bp3-button looks like over the component. The native
          // colors are translucent, so we use these hardcoded values while
          // dragging so that musicians can be truly opaque and won't look
          // janky when they overlap.
          backgroundColor: 'rgb(83, 99, 112)',
          borderColor: 'rgb(152, 161, 170)',
        }
      : {}),
    userSelect: 'none',
  };

  return result;
}

function Person({ provided, item, style, isDragging, disabled = false }) {
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
      className={'bp3-button bp3-outlined' + (disabled ? ' bp3-disabled' : '')}
    >
      {item.name}
    </div>
  );
}

function PersonList({ column, isDropDisabled, isDragDisabled = false }) {
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
      isDropDisabled={isDropDisabled}
    >
      {(provided, snapshot) => (
        <div ref={provided.innerRef} className={styles.personList}>
          {_.map(column.items, (item, index) => (
            <Draggable
              draggableId={item.id}
              index={index}
              key={item.id}
              isDragDisabled={isDragDisabled}
            >
              {provided => (
                <Person
                  provided={provided}
                  item={item}
                  style={{ left: 8 }}
                  isDragging={false}
                  disabled={isDragDisabled}
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
