import serviceCreateWarehouseMovementResource from '@services/warehouseMovementResource/serviceCreateWarehouseMovementResource'
import WarehouseMovementResource from '@models/warehouseMovomentResource'
import WarehouseResource from '@models/warehouseResource'
import { v4 as uuid } from 'uuid'

// Mock the models
jest.mock('@models/warehouseMovomentResource')
jest.mock('@models/warehouseResource')

const mockWarehouseMovementResourceCreate = WarehouseMovementResource.create as jest.Mock
const mockWarehouseResourceFindOne = WarehouseResource.findOne as jest.Mock
const mockWarehouseResourceCreate = WarehouseResource.create as jest.Mock
// Mock the save method on instances of WarehouseResource
const mockWarehouseResourceSave = jest.fn()

describe('serviceCreateWarehouseMovementResource', () => {
  beforeEach(() => {
    // Clear all mock calls and instances before each test
    jest.clearAllMocks()

    // Reset mock implementations if needed, or provide default successful implementations
    mockWarehouseMovementResourceCreate.mockResolvedValue({
      movement_id: uuid(),
      warehouse_id: uuid(),
      resource_id: uuid(),
      movement_type: 'entrada',
      quantity: 10,
      movement_date: new Date(),
      observations: null,
      toJSON: () => ({}), // Add toJSON if your service uses it
    } as any)

    // Setup default mock for findOne to return null (resource not found)
    mockWarehouseResourceFindOne.mockResolvedValue(null)
    // Setup default mock for create
    mockWarehouseResourceCreate.mockImplementation((data: any) =>
      Promise.resolve({ ...data, id: uuid(), save: mockWarehouseResourceSave, toJSON: () => ({}) }),
    )
    // Setup default mock for save
    mockWarehouseResourceSave.mockResolvedValue({} as any) // Adjust if save returns something specific
  })

  // Test case 1: Entrada - successful creation and update
  it('should create a new movement and update WarehouseResource for "entrada"', async () => {
    const warehouse_id = uuid()
    const resource_id = uuid()
    const initialQuantity = 50
    const movementQuantity = 10

    mockWarehouseResourceFindOne.mockResolvedValueOnce({
      id: uuid(),
      warehouse_id,
      resource_id,
      quantity: initialQuantity,
      save: mockWarehouseResourceSave,
      toJSON: () => ({ quantity: initialQuantity + movementQuantity }),
    })

    const body = {
      warehouse_id,
      resource_id,
      movement_type: 'entrada',
      quantity: movementQuantity,
      movement_date: new Date(),
      movement_id: uuid(), // movement_id is optional in attributes but schema expects it
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(mockWarehouseResourceFindOne).toHaveBeenCalledWith({
      where: { warehouse_id, resource_id },
    })
    expect(mockWarehouseResourceSave).toHaveBeenCalled()
    expect(mockWarehouseMovementResourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...body,
        observations: null, // Ensure observations is handled
      }),
    )
    expect(result.warehouseResource?.toJSON().quantity).toBe(initialQuantity + movementQuantity)
    expect(result.newRecord).toBeDefined()
  })

  // Test case 2: Salida - successful creation and update
  it('should create a new movement and update WarehouseResource for "salida" with sufficient quantity', async () => {
    const warehouse_id = uuid()
    const resource_id = uuid()
    const initialQuantity = 50
    const movementQuantity = 10

    const mockWarehouseResourceInstance = {
      id: uuid(),
      warehouse_id,
      resource_id,
      quantity: initialQuantity,
      save: mockWarehouseResourceSave,
      toJSON: () => ({ quantity: initialQuantity - movementQuantity }),
    }
    mockWarehouseResourceFindOne.mockResolvedValueOnce(mockWarehouseResourceInstance)

    const body = {
      warehouse_id,
      resource_id,
      movement_type: 'salida',
      quantity: movementQuantity,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(mockWarehouseResourceFindOne).toHaveBeenCalledWith({
      where: { warehouse_id, resource_id },
    })
    expect(mockWarehouseResourceInstance.save).toHaveBeenCalled()
    expect(mockWarehouseMovementResourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...body,
        observations: null,
      }),
    )
    expect(result.warehouseResource?.toJSON().quantity).toBe(initialQuantity - movementQuantity)
    expect(result.newRecord).toBeDefined()
  })

  // Test case 3: Salida - insufficient quantity
  it('should return an error for "salida" with insufficient quantity', async () => {
    const warehouse_id = uuid()
    const resource_id = uuid()
    const initialQuantity = 5
    const movementQuantity = 10

    mockWarehouseResourceFindOne.mockResolvedValueOnce({
      id: uuid(),
      warehouse_id,
      resource_id,
      quantity: initialQuantity,
      save: mockWarehouseResourceSave,
    })

    const body = {
      warehouse_id,
      resource_id,
      movement_type: 'salida',
      quantity: movementQuantity,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(mockWarehouseResourceFindOne).toHaveBeenCalledWith({
      where: { warehouse_id, resource_id },
    })
    expect(result.error).toBeDefined()
    expect(result.error).toContain('No hay suficiente cantidad')
    expect(mockWarehouseResourceSave).not.toHaveBeenCalled()
    expect(mockWarehouseMovementResourceCreate).not.toHaveBeenCalled()
  })

  // Test case 4: Salida - WarehouseResource does not exist
  it('should return an error for "salida" if WarehouseResource does not exist', async () => {
    const warehouse_id = uuid()
    const resource_id = uuid()
    const movementQuantity = 10

    // findOne returns null by default based on beforeEach setup
    mockWarehouseResourceFindOne.mockResolvedValueOnce(null)

    const body = {
      warehouse_id,
      resource_id,
      movement_type: 'salida',
      quantity: movementQuantity,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(mockWarehouseResourceFindOne).toHaveBeenCalledWith({
      where: { warehouse_id, resource_id },
    })
    expect(result.error).toBeDefined()
    expect(result.error).toContain('No hay suficiente cantidad')
    expect(mockWarehouseResourceCreate).not.toHaveBeenCalled()
    expect(mockWarehouseMovementResourceCreate).not.toHaveBeenCalled()
  })

  // Test case 5: Entrada - WarehouseResource does not exist, should create it
  it('should create WarehouseResource if it does not exist for "entrada"', async () => {
    const warehouse_id = uuid()
    const resource_id = uuid()
    const movementQuantity = 20

    // findOne returns null by default
    mockWarehouseResourceFindOne.mockResolvedValueOnce(null)
    // create returns a new resource
    const createdWarehouseResource = {
      id: uuid(),
      warehouse_id,
      resource_id,
      quantity: movementQuantity,
      entry_date: expect.any(Date),
      save: mockWarehouseResourceSave,
      toJSON: () => ({ quantity: movementQuantity }),
    }
    mockWarehouseResourceCreate.mockResolvedValueOnce(createdWarehouseResource)


    const body = {
      warehouse_id,
      resource_id,
      movement_type: 'entrada',
      quantity: movementQuantity,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(mockWarehouseResourceFindOne).toHaveBeenCalledWith({
      where: { warehouse_id, resource_id },
    })
    expect(mockWarehouseResourceCreate).toHaveBeenCalledWith({
      warehouse_id,
      resource_id,
      quantity: movementQuantity,
      entry_date: expect.any(Date), // service sets this
    })
    expect(mockWarehouseMovementResourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...body,
        observations: null,
      }),
    )
    expect(result.warehouseResource?.toJSON().quantity).toBe(movementQuantity)
    expect(result.newRecord).toBeDefined()
  })

  // Test case 6: Invalid movement_type
  it('should return a validation error for invalid movement_type', async () => {
    const body = {
      warehouse_id: uuid(),
      resource_id: uuid(),
      movement_type: 'invalid_type', // Invalid type
      quantity: 10,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)

    expect(result.error).toBeDefined()
    expect(result.error[0].message).toContain('El tipo de movimiento debe ser "salida" o "entrada"')
    expect(mockWarehouseMovementResourceCreate).not.toHaveBeenCalled()
  })

  // Test case 7: Missing required fields (e.g., warehouse_id)
  it('should return a validation error if warehouse_id is missing', async () => {
    const body = {
      // warehouse_id: uuid(), // Missing
      resource_id: uuid(),
      movement_type: 'entrada',
      quantity: 10,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)
    expect(result.error).toBeDefined()
    // Zod errors path will show ['warehouse_id']
    expect(result.error[0].path).toContain('warehouse_id')
    expect(result.error[0].message).toBe('El ID del almacén no puede estar vacío')
    expect(mockWarehouseMovementResourceCreate).not.toHaveBeenCalled()
  })

  it('should return a validation error if resource_id is missing', async () => {
    const body = {
      warehouse_id: uuid(),
      // resource_id: uuid(), // Missing
      movement_type: 'entrada',
      quantity: 10,
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)
    expect(result.error).toBeDefined()
    expect(result.error[0].path).toContain('resource_id')
    expect(result.error[0].message).toBe('El ID del recurso no puede estar vacío')
  })

  it('should return a validation error if quantity is negative', async () => {
    const body = {
      warehouse_id: uuid(),
      resource_id: uuid(),
      movement_type: 'entrada',
      quantity: -5, // Invalid
      movement_date: new Date(),
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)
    expect(result.error).toBeDefined()
    expect(result.error[0].path).toContain('quantity')
    expect(result.error[0].message).toBe('La cantidad no puede ser negativa')
  })

  it('should return a validation error if movement_date is invalid', async () => {
    const body = {
      warehouse_id: uuid(),
      resource_id: uuid(),
      movement_type: 'entrada',
      quantity: 5,
      movement_date: 'not-a-date', // Invalid
      movement_id: uuid(),
    }

    const result = await serviceCreateWarehouseMovementResource(body as any)
    expect(result.error).toBeDefined()
    expect(result.error[0].path).toContain('movement_date')
    expect(result.error[0].message).toBe('La fecha del movimiento debe ser válida')
  })
})
