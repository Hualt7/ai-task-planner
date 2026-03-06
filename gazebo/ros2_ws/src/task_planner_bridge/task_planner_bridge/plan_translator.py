"""
Plan Translator — maps symbolic entity IDs to Gazebo world coordinates.

Grid mapping:
  Grid (row, col) → World (col * cell_size + cell_size/2, -(row * cell_size + cell_size/2))

  With cell_size = 0.5m:
    (0, 0) → (0.25, -0.25)
    (2, 3) → (1.75, -1.25)
    (9, 9) → (4.75, -4.75)
"""

from typing import Tuple


# Entity positions matching createInitialState() in state.ts
ENTITY_GRID_POSITIONS = {
    # Objects
    'red_box': (2, 3),
    'blue_box': (4, 1),
    'green_box': (6, 7),
    'yellow_box': (8, 5),
    # Surfaces
    'shelf_a': (1, 8),
    'shelf_b': (3, 8),
    'table_1': (5, 5),
    'table_2': (7, 2),
    # Containers
    'container_a': (3, 4),
    'container_b': (7, 7),
}


class PlanTranslator:
    """Translates between grid coordinates and Gazebo world coordinates."""

    def __init__(self, cell_size: float = 0.5):
        self.cell_size = cell_size

    def grid_to_world(self, row: int, col: int) -> Tuple[float, float]:
        """Convert grid (row, col) to Gazebo world (x, y)."""
        x = col * self.cell_size + self.cell_size / 2
        y = -(row * self.cell_size + self.cell_size / 2)
        return (x, y)

    def world_to_grid(self, x: float, y: float) -> Tuple[int, int]:
        """Convert Gazebo world (x, y) to grid (row, col)."""
        col = int(x / self.cell_size)
        row = int(-y / self.cell_size)
        return (row, col)

    def entity_to_world(self, entity_id: str) -> Tuple[float, float]:
        """Get the Gazebo world position for a known entity.

        For navigation targets, we offset slightly so the robot
        stops adjacent to the entity rather than on top of it.
        """
        if entity_id not in ENTITY_GRID_POSITIONS:
            raise ValueError(f'Unknown entity: {entity_id}')

        row, col = ENTITY_GRID_POSITIONS[entity_id]
        return self.grid_to_world(row, col)

    def update_positions(self, positions: dict):
        """Update entity positions from web app (for randomized layouts)."""
        for entity_id, pos in positions.items():
            ENTITY_GRID_POSITIONS[entity_id] = (pos['row'], pos['col'])

    def adjacent_position(
        self, entity_id: str, offset_row: int = 0, offset_col: int = -1
    ) -> Tuple[float, float]:
        """Get a world position adjacent to an entity.

        Default offset is one cell to the west (col - 1).
        """
        if entity_id not in ENTITY_GRID_POSITIONS:
            raise ValueError(f'Unknown entity: {entity_id}')

        row, col = ENTITY_GRID_POSITIONS[entity_id]
        adj_row = row + offset_row
        adj_col = col + offset_col
        return self.grid_to_world(adj_row, adj_col)
