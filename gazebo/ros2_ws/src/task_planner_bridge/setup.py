from setuptools import find_packages, setup

package_name = 'task_planner_bridge'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/launch', ['launch/bridge.launch.py']),
    ],
    install_requires=['setuptools', 'websockets'],
    zip_safe=True,
    maintainer='task_planner',
    maintainer_email='dev@example.com',
    description='WebSocket bridge between AI Task Planner and ROS2/Gazebo',
    license='MIT',
    entry_points={
        'console_scripts': [
            'bridge_node = task_planner_bridge.bridge_node:main',
        ],
    },
)
